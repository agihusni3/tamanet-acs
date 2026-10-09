import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Olt } from '../olt/olt.entity';
import { PonPort } from '../olt/pon-port.entity';
import { Onu, OnuStatus, OfflineReason } from '../olt/onu.entity';
import { Device } from '../devices/device.entity';
import { Alert, AlertSeverity, AlertStatus } from '../alerts/alert.entity';
import { MockOltDriver } from './mock-driver';
import { HiosoDriver } from './hioso-driver';
import { HisfocusDriver } from './hisfocus-driver';
import { OltDriver } from './olt-driver.interface';

@Injectable()
export class OltCollectorService {
  private readonly logger = new Logger(OltCollectorService.name);

  constructor(
    @InjectRepository(Olt)
    private readonly oltRepo: Repository<Olt>,
    @InjectRepository(PonPort)
    private readonly portRepo: Repository<PonPort>,
    @InjectRepository(Onu)
    private readonly onuRepo: Repository<Onu>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
  ) {}

  /**
   * Mengambil driver sesuai konfigurasi OLT:
   * - Hioso HA7302CST, HA7304, 2P1G: HiosoDriver (Telnet CLI & SNMP)
   * - Hisfocus / HSGQ (HSGQ-E02, HSGQ-G02, 2-PON): HisfocusDriver (Telnet CLI & SNMP)
   * - Fallback/Mock: MockOltDriver
   */
  getDriver(olt: Olt): OltDriver {
    const isForceMock = process.env.OLT_MOCK_MODE === 'true';
    if (isForceMock) {
      return new MockOltDriver(olt.name);
    }

    const vendor = (olt.vendor || '').toLowerCase();
    const model = (olt.model || '').toLowerCase();

    // 1. Deteksi spesifik model Hioso: HA7302CST, HA7304, 2P1G, atau vendor Hioso
    const isHioso =
      vendor.includes('hioso') ||
      model.includes('ha7302') ||
      model.includes('ha7304') ||
      model.includes('7302') ||
      model.includes('7304') ||
      model.includes('2p1g');

    if (isHioso) {
      this.logger.log(
        `[OLT Collector] Menggunakan HiosoDriver riil untuk OLT '${olt.name}' (${olt.vendor} ${olt.model} @ ${olt.ip})`,
      );
      return new HiosoDriver(olt);
    }

    // 2. Deteksi spesifik Hisfocus / HSGQ 2 PON (termasuk variasi typo seperti 'hisfous')
    const isHisfocus =
      vendor.includes('hisfocus') ||
      vendor.includes('hsgq') ||
      vendor.includes('hisfous') ||
      model.includes('hsgq') ||
      model.includes('hisfocus') ||
      model.includes('hisfous') ||
      model.includes('e02') ||
      model.includes('g02');

    if (isHisfocus) {
      this.logger.log(
        `[OLT Collector] Menggunakan HisfocusDriver riil untuk OLT '${olt.name}' (${olt.vendor} ${olt.model} @ ${olt.ip})`,
      );
      return new HisfocusDriver(olt);
    }

    // Default mock jika vendor lain belum dikembangkan driver fisiknya
    this.logger.warn(
      `[OLT Driver] Real driver untuk '${olt.name}' (${olt.vendor} ${olt.model}) belum tersedia. Menggunakan MockOltDriver.`,
    );
    return new MockOltDriver(olt.name);
  }

  /**
   * Menjalankan siklus polling pengumpulan data dari semua OLT terdaftar.
   * Mitigasi ADV-03: Menggunakan controlled concurrency pool (batch 4 OLT paralel)
   * agar OLT yang offline/timeout tidak memblokir OLT yang sehat secara berurutan.
   */
  async collectAll(): Promise<{ polledOlts: number; totalOnus: number }> {
    const olts = await this.oltRepo.find();
    let totalOnus = 0;
    const CONCURRENCY_LIMIT = 4;

    for (let i = 0; i < olts.length; i += CONCURRENCY_LIMIT) {
      const batch = olts.slice(i, i + CONCURRENCY_LIMIT);
      const results = await Promise.allSettled(
        batch.map(async (olt) => {
          try {
            return await this.collectFromOlt(olt);
          } catch (err: any) {
            this.logger.error(`Gagal mengumpulkan data dari OLT '${olt.name}': ${err.message}`);
            return 0;
          }
        }),
      );

      for (const res of results) {
        if (res.status === 'fulfilled') {
          totalOnus += res.value;
        }
      }
    }

    return { polledOlts: olts.length, totalOnus };
  }

  /**
   * Tarik data dari satu OLT, korelasi dengan devices, dan deteksi gangguan massal
   */
  async collectFromOlt(olt: Olt): Promise<number> {
    const driver = this.getDriver(olt);

    // 1. Sinkronisasi Port PON (Pre-fetch & In-Memory Map)
    const ports = await driver.listPonPorts();
    const existingPorts = await this.portRepo.find({ where: { oltId: olt.id } });
    const portMap = new Map<string, PonPort>();

    const portsToCreate: PonPort[] = [];
    for (const p of ports) {
      const key = `${p.slot}/${p.port}`;
      let portEntity = existingPorts.find((ep) => ep.slot === p.slot && ep.port === p.port);
      if (!portEntity) {
        portEntity = this.portRepo.create({
          oltId: olt.id,
          slot: p.slot,
          port: p.port,
          label: p.label,
        });
        portsToCreate.push(portEntity);
      }
      portMap.set(key, portEntity);
    }
    if (portsToCreate.length > 0) {
      const savedNewPorts = await this.portRepo.save(portsToCreate);
      for (const sp of savedNewPorts) {
        portMap.set(`${sp.slot}/${sp.port}`, sp);
      }
    }

    // 2. Ambil data semua ONU dari OLT
    const onus = await driver.listOnus();

    // 3. Pre-load Existing ONUs & Devices (Eliminasi N+1 Queries)
    const existingOnus = await this.onuRepo.find({ where: { oltId: olt.id } });
    const onuMap = new Map<string, Onu>();
    for (const eo of existingOnus) {
      onuMap.set(`${eo.ponPortId}:${eo.onuIndex}`, eo);
    }

    const allDevices = await this.deviceRepo.find({ select: ['id', 'mac', 'serial'] });
    const deviceMacMap = new Map<string, string>();
    const deviceSerialMap = new Map<string, string>();
    for (const d of allDevices) {
      if (d.mac) {
        deviceMacMap.set(d.mac.replace(/[:-]/g, '').toUpperCase(), d.id);
      }
      if (d.serial) {
        deviceSerialMap.set(d.serial.toUpperCase().trim(), d.id);
      }
    }

    const portLossCount = new Map<string, number>();
    const onusToSave: Onu[] = [];
    const now = new Date();

    for (const info of onus) {
      const portKey = `${info.slot}/${info.port}`;
      const portEntity = portMap.get(portKey);
      if (!portEntity) continue;

      const onuKey = `${portEntity.id}:${info.onuIndex}`;
      let onu = onuMap.get(onuKey);

      // Cari korelasi device di ACS berdasarkan MAC Address atau GPON Serial Number (O(1))
      let matchedDeviceId: string | null = null;
      if (info.mac) {
        const cleanMac = info.mac.replace(/[:-]/g, '').toUpperCase();
        matchedDeviceId = deviceMacMap.get(cleanMac) || null;
      }
      if (!matchedDeviceId && info.sn) {
        const cleanSn = info.sn.toUpperCase().trim();
        matchedDeviceId = deviceSerialMap.get(cleanSn) || null;
      }

      if (!onu) {
        onu = this.onuRepo.create({
          oltId: olt.id,
          ponPortId: portEntity.id,
          onuIndex: info.onuIndex,
          mac: info.mac,
          sn: info.sn || null,
          name: info.name,
          status: info.status,
          offlineReason: info.offlineReason,
          rxPower: info.rxPower,
          txPower: info.txPower,
          distance: info.distance,
          deviceId: matchedDeviceId,
          lastSeen: now,
        });
      } else {
        onu.mac = info.mac;
        if (info.sn) onu.sn = info.sn;
        onu.status = info.status;
        onu.offlineReason = info.offlineReason;
        onu.rxPower = info.rxPower;
        onu.txPower = info.txPower;
        onu.distance = info.distance;
        if (matchedDeviceId) {
          onu.deviceId = matchedDeviceId;
        }
        onu.lastSeen = now;
      }

      onusToSave.push(onu);

      // Hitung offline LOS untuk deteksi gangguan massal
      if (info.status === OnuStatus.OFFLINE && info.offlineReason === OfflineReason.LOS) {
        const currentLoss = portLossCount.get(portEntity.id) || 0;
        portLossCount.set(portEntity.id, currentLoss + 1);
      }
    }

    // Simpan semua ONU dalam 1 transaksi batch (jauh lebih cepat & efisien)
    if (onusToSave.length > 0) {
      await this.onuRepo.save(onusToSave, { chunk: 100 });
    }

    // 4. Deteksi Gangguan Massal (MASS OUTAGE Detection)
    // Aturan: Jika >= 5 ONU atau >= 30% di port PON yang sama mengalami LOS bersamaan
    for (const [portId, losCount] of portLossCount.entries()) {
      if (losCount >= 3) {
        // Ambang batas 3 untuk demo/skala uji
        const port = await this.portRepo.findOne({ where: { id: portId } });
        const existingAlert = await this.alertRepo.findOne({
          where: {
            type: 'MASS_OUTAGE',
            status: AlertStatus.ACTIVE,
            message: `Gangguan Massal (Kabel Putus) terdeteksi pada ${olt.name} Port ${port?.label}`,
          },
        });

        if (!existingAlert) {
          const alert = this.alertRepo.create({
            type: 'MASS_OUTAGE',
            severity: AlertSeverity.CRITICAL,
            message: `Gangguan Massal (Kabel Putus) terdeteksi pada ${olt.name} Port ${port?.label}. ${losCount} modem mengalami Loss of Signal (LOS).`,
            status: AlertStatus.ACTIVE,
          });
          await this.alertRepo.save(alert);
          this.logger.warn(`[ALERT] MASS_OUTAGE dibuat untuk port ${port?.label}`);
        }
      }
    }

    // 5. Update status uptime OLT via SNMP jika tersedia
    if (driver instanceof HiosoDriver) {
      try {
        const snmpRes = await driver.testSnmp();
        if (snmpRes.online && snmpRes.uptimeSeconds) {
          const days = Math.floor(snmpRes.uptimeSeconds / 86400);
          const hours = Math.floor((snmpRes.uptimeSeconds % 86400) / 3600);
          olt.uptime = `${days}h ${hours}j (SNMP)`;
          await this.oltRepo.save(olt);
        }
      } catch {
        // Abaikan jika snmp timeout
      }
    }

    return onus.length;
  }

  /**
   * Tarik data dari satu OLT berdasarkan ID
   */
  async collectFromOltById(id: string): Promise<{ success: boolean; totalOnus: number; message: string }> {
    const olt = await this.oltRepo.findOne({ where: { id } });
    if (!olt) {
      throw new Error(`OLT dengan ID '${id}' tidak ditemukan`);
    }

    const totalOnus = await this.collectFromOlt(olt);
    return {
      success: true,
      totalOnus,
      message: `Berhasil sinkronisasi ${totalOnus} ONU dari OLT '${olt.name}'`,
    };
  }

  /**
   * Tes diagnostik konektivitas ke OLT (Telnet & SNMP)
   */
  async testOltConnection(id: string): Promise<{
    oltName: string;
    ip: string;
    model: string;
    telnetStatus: 'ONLINE' | 'OFFLINE';
    snmpStatus: 'ONLINE' | 'OFFLINE';
    sysDescr?: string;
    uptime?: string;
    onuCount?: number;
    error?: string;
  }> {
    const olt = await this.oltRepo.findOne({ where: { id } });
    if (!olt) {
      throw new Error(`OLT dengan ID '${id}' tidak ditemukan`);
    }

    const driver = this.getDriver(olt);
    let telnetStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
    let snmpStatus: 'ONLINE' | 'OFFLINE' = 'OFFLINE';
    let sysDescr = '';
    let uptime = '';
    let onuCount = 0;
    let errorMsg: string | undefined;

    if (driver instanceof HiosoDriver) {
      // 1. Tes SNMP
      try {
        const snmpRes = await driver.testSnmp();
        if (snmpRes.online) {
          snmpStatus = 'ONLINE';
          sysDescr = snmpRes.sysDescr || '';
          if (snmpRes.uptimeSeconds) {
            const days = Math.floor(snmpRes.uptimeSeconds / 86400);
            const hours = Math.floor((snmpRes.uptimeSeconds % 86400) / 3600);
            uptime = `${days}h ${hours}j`;
          }
        }
      } catch (err: any) {
        this.logger.warn(`[Test OLT] SNMP test gagal: ${err.message}`);
      }

      // 2. Tes Telnet CLI
      try {
        const onus = await driver.listOnus();
        telnetStatus = 'ONLINE';
        onuCount = onus.length;
      } catch (err: any) {
        telnetStatus = 'OFFLINE';
        errorMsg = err.message;
      }
    } else {
      // Mock driver
      telnetStatus = 'ONLINE';
      snmpStatus = 'ONLINE';
      const onus = await driver.listOnus();
      onuCount = onus.length;
    }

    return {
      oltName: olt.name,
      ip: olt.ip,
      model: olt.model,
      telnetStatus,
      snmpStatus,
      sysDescr: sysDescr || undefined,
      uptime: uptime || olt.uptime || undefined,
      onuCount,
      error: errorMsg,
    };
  }
}
