import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Olt } from '../olt/olt.entity';
import { PonPort } from '../olt/pon-port.entity';
import { Onu, OnuStatus, OfflineReason } from '../olt/onu.entity';
import { Device } from '../devices/device.entity';
import { Alert, AlertSeverity, AlertStatus } from '../alerts/alert.entity';
import { MockOltDriver } from './mock-driver';
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
   * Mengambil driver sesuai konfigurasi OLT (Mock atau Real)
   */
  getDriver(olt: Olt): OltDriver {
    const isMock = process.env.OLT_MOCK_MODE !== 'false';
    if (isMock) {
      return new MockOltDriver(olt.name);
    }
    // Jika OLT fisik tersedia, arahkan ke driver Snmp / Cli
    return new MockOltDriver(olt.name);
  }

  /**
   * Menjalankan siklus polling pengumpulan data dari semua OLT terdaftar
   */
  async collectAll(): Promise<{ polledOlts: number; totalOnus: number }> {
    const olts = await this.oltRepo.find();
    let totalOnus = 0;

    for (const olt of olts) {
      try {
        const count = await this.collectFromOlt(olt);
        totalOnus += count;
      } catch (err: any) {
        this.logger.error(`Gagal mengumpulkan data dari OLT '${olt.name}': ${err.message}`);
      }
    }

    return { polledOlts: olts.length, totalOnus };
  }

  /**
   * Tarik data dari satu OLT, korelasi dengan devices, dan deteksi gangguan massal
   */
  async collectFromOlt(olt: Olt): Promise<number> {
    const driver = this.getDriver(olt);

    // 1. Sinkronisasi Port PON
    const ports = await driver.listPonPorts();
    const portMap = new Map<string, PonPort>();

    for (const p of ports) {
      let portEntity = await this.portRepo.findOne({
        where: { oltId: olt.id, slot: p.slot, port: p.port },
      });
      if (!portEntity) {
        portEntity = this.portRepo.create({
          oltId: olt.id,
          slot: p.slot,
          port: p.port,
          label: p.label,
        });
        await this.portRepo.save(portEntity);
      }
      portMap.set(`${p.slot}/${p.port}`, portEntity);
    }

    // 2. Ambil data semua ONU dari OLT
    const onus = await driver.listOnus();

    // 3. Simpan dan korelasikan dengan tabel devices (via MAC Address)
    const portLossCount = new Map<string, number>();

    for (const info of onus) {
      const portKey = `${info.slot}/${info.port}`;
      const portEntity = portMap.get(portKey);
      if (!portEntity) continue;

      let onu = await this.onuRepo.findOne({
        where: {
          oltId: olt.id,
          ponPortId: portEntity.id,
          onuIndex: info.onuIndex,
        },
      });

      // Cari korelasi device di ACS berdasarkan MAC Address
      let matchedDevice: Device | null = null;
      if (info.mac) {
        const cleanMac = info.mac.replace(/[:-]/g, '').toUpperCase();
        matchedDevice = await this.deviceRepo
          .createQueryBuilder('d')
          .where("UPPER(REPLACE(REPLACE(d.mac, ':', ''), '-', '')) = :mac", { mac: cleanMac })
          .getOne();
      }

      if (!onu) {
        onu = this.onuRepo.create({
          oltId: olt.id,
          ponPortId: portEntity.id,
          onuIndex: info.onuIndex,
          mac: info.mac,
          name: info.name,
          status: info.status,
          offlineReason: info.offlineReason,
          rxPower: info.rxPower,
          txPower: info.txPower,
          distance: info.distance,
          deviceId: matchedDevice?.id || null,
          lastSeen: new Date(),
        });
      } else {
        onu.mac = info.mac;
        onu.status = info.status;
        onu.offlineReason = info.offlineReason;
        onu.rxPower = info.rxPower;
        onu.txPower = info.txPower;
        onu.distance = info.distance;
        if (matchedDevice) {
          onu.deviceId = matchedDevice.id;
        }
        onu.lastSeen = new Date();
      }

      await this.onuRepo.save(onu);

      // Hitung offline LOS untuk deteksi gangguan massal
      if (info.status === OnuStatus.OFFLINE && info.offlineReason === OfflineReason.LOS) {
        const currentLoss = portLossCount.get(portEntity.id) || 0;
        portLossCount.set(portEntity.id, currentLoss + 1);
      }
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

    return onus.length;
  }
}
