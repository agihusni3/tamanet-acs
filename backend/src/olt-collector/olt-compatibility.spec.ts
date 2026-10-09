import { CliParserService } from './cli-parser.service';
import { OnuStatus, OfflineReason } from '../olt/onu.entity';
import { OltCollectorService } from './olt-collector.service';
import { Olt } from '../olt/olt.entity';
import { PonPort } from '../olt/pon-port.entity';
import { Onu } from '../olt/onu.entity';
import { Device } from '../devices/device.entity';
import { Alert } from '../alerts/alert.entity';
import { Repository } from 'typeorm';

describe('Uji Kompatibilitas OLT & Cross-Layer Correlation', () => {
  describe('1. Uji Parser CLI OLT Multi-Vendor (CliParserService)', () => {
    let parser: CliParserService;

    beforeEach(() => {
      parser = new CliParserService();
    });

    it('harus dapat mem-parsing format EPON standar dengan MAC address (Hioso / HSGQ)', () => {
      const line = 'EPON0/1:1   00:25:9E:11:22:33   online      -19.45   2.10   1200';
      const parsed = parser.parseLine(line);

      expect(parsed).not.toBeNull();
      expect(parsed?.slot).toBe(0);
      expect(parsed?.port).toBe(1);
      expect(parsed?.onuIndex).toBe(1);
      expect(parsed?.mac).toBe('00:25:9E:11:22:33');
      expect(parsed?.status).toBe(OnuStatus.ONLINE);
      expect(parsed?.offlineReason).toBeNull();
      expect(parsed?.rxPower).toBe('-19.45');
      expect(parsed?.txPower).toBe('2.10');
      expect(parsed?.distance).toBe(1200);
    });

    it('harus dapat mem-parsing format dot-notation MAC (Cisco/Huawei OLT style: aabb.ccdd.eeff)', () => {
      const line = 'EPON0/2:4   0025.9e11.aabb   active      -21.30   +1.85   850';
      const parsed = parser.parseLine(line);

      expect(parsed).not.toBeNull();
      expect(parsed?.mac).toBe('00:25:9E:11:AA:BB');
      expect(parsed?.status).toBe(OnuStatus.ONLINE);
      expect(parsed?.rxPower).toBe('-21.30');
      expect(parsed?.distance).toBe(850);
    });

    it('harus dapat mengekstrak GPON Serial Number (Huawei HWTC, ZTE ZTEG, VSOL)', () => {
      const lineHuawei = 'GPON0/1:1   HWTC8245ABCD   online   -19.80   2.20   1500';
      const parsedHuawei = parser.parseLine(lineHuawei);

      expect(parsedHuawei).not.toBeNull();
      expect(parsedHuawei?.sn).toBe('HWTC8245ABCD');
      expect(parsedHuawei?.status).toBe(OnuStatus.ONLINE);
      expect(parsedHuawei?.rxPower).toBe('-19.80');

      const lineZte = 'GPON0/1:2   ZTEGC1234567   online   -21.40   1.95   2100';
      const parsedZte = parser.parseLine(lineZte);

      expect(parsedZte).not.toBeNull();
      expect(parsedZte?.sn).toBe('ZTEGC1234567');
      expect(parsedZte?.status).toBe(OnuStatus.ONLINE);

      const lineVsol = 'GPON0/2:3   VSOL12345678   online   -18.90   2.30   900';
      const parsedVsol = parser.parseLine(lineVsol);

      expect(parsedVsol).not.toBeNull();
      expect(parsedVsol?.sn).toBe('VSOL12345678');
      expect(parsedVsol?.status).toBe(OnuStatus.ONLINE);
    });

    it('harus mengklasifikasikan gangguan LOS (Kabel Optik Putus)', () => {
      const line = 'EPON0/1:2   00:25:9E:11:22:44   LOS         -        -      -';
      const parsed = parser.parseLine(line);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe(OnuStatus.OFFLINE);
      expect(parsed?.offlineReason).toBe(OfflineReason.LOS);
    });

    it('harus mengklasifikasikan gangguan Dying-Gasp (Mati Listrik di Pelanggan)', () => {
      const line = 'EPON0/1:3   00:25:9E:11:22:55   Dying-Gasp  -        -      -';
      const parsed = parser.parseLine(line);

      expect(parsed).not.toBeNull();
      expect(parsed?.status).toBe(OnuStatus.OFFLINE);
      expect(parsed?.offlineReason).toBe(OfflineReason.DYING_GASP);
    });

    it('harus mengabaikan header atau baris pembatas CLI', () => {
      expect(parser.parseLine('----------------------------------------------------')).toBeNull();
      expect(parser.parseLine('Port        MAC/SN              Status      Rx(dBm)')).toBeNull();
      expect(parser.parseLine('Total ONUs: 12')).toBeNull();
      expect(parser.parseLine('')).toBeNull();
    });
  });

  describe('2. Uji Korelasi Silang OLT ONU <-> ACS ONT Device (OltCollectorService)', () => {
    let collector: OltCollectorService;
    let mockOltRepo: Partial<Repository<Olt>>;
    let mockPortRepo: Partial<Repository<PonPort>>;
    let mockOnuRepo: Partial<Repository<Onu>>;
    let mockDeviceRepo: Partial<Repository<Device>>;
    let mockAlertRepo: Partial<Repository<Alert>>;

    const mockOlt: Olt = {
      id: 'olt-uuid-1',
      name: 'OLT Utama Hioso Pusat',
      vendor: 'Hioso',
      model: 'HA7304',
      ip: '192.168.10.10',
      snmpCommunity: 'public',
      snmpVersion: 'v2c',
      cliUser: 'admin',
      cliPass: null,
      ponType: 'EPON' as any,
      geom: null,
      webPort: 80,
      cliPort: 23,
      ponPortsCount: 4,
      defaultUser: 'admin',
      defaultPass: 'admin',
      uptime: '15d',
      ports: [],
      onus: [],
    };

    const mockPortEntity: PonPort = {
      id: 'port-uuid-1',
      oltId: mockOlt.id,
      slot: 0,
      port: 1,
      label: 'EPON0/1',
      olt: mockOlt,
      onus: [],
    };

    const mockAcsDeviceEpon: Device = {
      id: 'dev-epon-uuid',
      genieId: '00259E-HG8245H5-HWTC112233',
      serial: 'HWTC112233',
      mac: '00:25:9E:11:22:33',
      oui: '00259E',
      productClass: 'HG8245H5',
      manufacturer: 'Huawei',
      model: 'HG8245H5',
      firmware: 'V5R019C00S105',
      profileId: null,
      profile: null,
      customerId: null,
      customer: null,
      status: 'ONLINE' as any,
      wanIp: '10.10.10.50',
      rxPowerAcs: '-19.45',
      uptime: 3600,
      lastInform: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAcsDeviceGpon: Device = {
      id: 'dev-gpon-uuid',
      genieId: '0015EB-F670L-ZTEGC1234567',
      serial: 'ZTEGC1234567',
      mac: null, // Banyak GPON ONT hanya melaporkan Serial Number di TR-069
      oui: '0015EB',
      productClass: 'F670L',
      manufacturer: 'ZTE',
      model: 'ZXHN F670L',
      firmware: 'V9.0.10P1N1',
      profileId: null,
      profile: null,
      customerId: null,
      customer: null,
      status: 'ONLINE' as any,
      wanIp: '10.10.10.51',
      rxPowerAcs: '-21.40',
      uptime: 7200,
      lastInform: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let savedOnus: Onu[] = [];

    beforeEach(() => {
      savedOnus = [];

      mockOltRepo = {
        find: jest.fn().mockResolvedValue([mockOlt]),
      };

      mockPortRepo = {
        find: jest.fn().mockResolvedValue([mockPortEntity]),
        findOne: jest.fn().mockResolvedValue(mockPortEntity),
        create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'port-created' })),
        save: jest.fn().mockImplementation(async (ports) => ports),
      };

      mockOnuRepo = {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((dto) => {
          const item = { ...dto, id: `onu-${Math.random()}` };
          return item;
        }),
        save: jest.fn().mockImplementation(async (onus) => {
          savedOnus.push(...onus);
          return onus;
        }),
      };

      mockDeviceRepo = {
        find: jest.fn().mockResolvedValue([mockAcsDeviceEpon, mockAcsDeviceGpon]),
      };

      mockAlertRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation(async (alert) => alert),
      };

      collector = new OltCollectorService(
        mockOltRepo as Repository<Olt>,
        mockPortRepo as Repository<PonPort>,
        mockOnuRepo as Repository<Onu>,
        mockDeviceRepo as Repository<Device>,
        mockAlertRepo as Repository<Alert>,
      );
    });

    it('harus mencocokkan ONU EPON dengan Device ACS via MAC Address', async () => {
      // Mock driver yang mengembalikan ONU dengan MAC Address
      const mockDriver = {
        listPonPorts: jest.fn().mockResolvedValue([{ slot: 0, port: 1, label: 'EPON0/1' }]),
        listOnus: jest.fn().mockResolvedValue([
          {
            slot: 0,
            port: 1,
            onuIndex: 1,
            mac: '00:25:9E:11:22:33',
            sn: null,
            status: OnuStatus.ONLINE,
            rxPower: '-19.45',
            txPower: '2.10',
            distance: 1200,
          },
        ]),
        getOnu: jest.fn(),
      };

      jest.spyOn(collector, 'getDriver').mockReturnValue(mockDriver as any);

      await collector.collectFromOlt(mockOlt);

      expect(savedOnus.length).toBe(1);
      const saved = savedOnus[0];
      expect(saved.deviceId).toBe(mockAcsDeviceEpon.id);
      expect(saved.mac).toBe('00:25:9E:11:22:33');
      expect(saved.status).toBe(OnuStatus.ONLINE);
    });

    it('harus mencocokkan ONU GPON dengan Device ACS via Serial Number saat MAC tidak tersedia', async () => {
      const mockDriver = {
        listPonPorts: jest.fn().mockResolvedValue([{ slot: 0, port: 1, label: 'EPON0/1' }]),
        listOnus: jest.fn().mockResolvedValue([
          {
            slot: 0,
            port: 1,
            onuIndex: 2,
            mac: null,
            sn: 'ZTEGC1234567',
            status: OnuStatus.ONLINE,
            rxPower: '-21.40',
            txPower: '1.95',
            distance: 2100,
          },
        ]),
        getOnu: jest.fn(),
      };

      jest.spyOn(collector, 'getDriver').mockReturnValue(mockDriver as any);

      await collector.collectFromOlt(mockOlt);

      expect(savedOnus.length).toBe(1);
      const saved = savedOnus[0];
      expect(saved.deviceId).toBe(mockAcsDeviceGpon.id);
      expect(saved.sn).toBe('ZTEGC1234567');
      expect(saved.status).toBe(OnuStatus.ONLINE);
    });

    it('harus memicu alarm gangguan massal Fiber Cut saat >= 3 ONU offline karena LOS pada port yang sama', async () => {
      const mockDriver = {
        listPonPorts: jest.fn().mockResolvedValue([{ slot: 0, port: 1, label: 'EPON0/1' }]),
        listOnus: jest.fn().mockResolvedValue([
          { slot: 0, port: 1, onuIndex: 1, status: OnuStatus.OFFLINE, offlineReason: OfflineReason.LOS },
          { slot: 0, port: 1, onuIndex: 2, status: OnuStatus.OFFLINE, offlineReason: OfflineReason.LOS },
          { slot: 0, port: 1, onuIndex: 3, status: OnuStatus.OFFLINE, offlineReason: OfflineReason.LOS },
        ]),
        getOnu: jest.fn(),
      };

      jest.spyOn(collector, 'getDriver').mockReturnValue(mockDriver as any);

      await collector.collectFromOlt(mockOlt);

      expect(mockAlertRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MASS_OUTAGE',
          severity: 'CRITICAL',
        }),
      );
      expect(mockAlertRepo.save).toHaveBeenCalled();
    });
  });

  describe('3. Uji Khusus OLT Hisfocus (HSGQ) 2 PON & Driver Riil', () => {
    let collector: OltCollectorService;
    let mockOltRepo: Partial<Repository<Olt>>;
    let mockPortRepo: Partial<Repository<PonPort>>;
    let mockOnuRepo: Partial<Repository<Onu>>;
    let mockDeviceRepo: Partial<Repository<Device>>;
    let mockAlertRepo: Partial<Repository<Alert>>;

    const mockHisfocusOlt: Olt = {
      id: 'olt-hisfocus-uuid',
      name: 'OLT-Hisfocus-2PON',
      vendor: 'Hisfocus',
      model: 'HSGQ-E02',
      ip: '192.168.1.100',
      snmpCommunity: 'public',
      snmpVersion: 'v2c',
      cliUser: 'admin',
      cliPass: null,
      ponType: 'EPON' as any,
      geom: null,
      webPort: 80,
      cliPort: 23,
      ponPortsCount: 2,
      defaultUser: 'admin',
      defaultPass: 'admin',
      uptime: '3d 12h',
      ports: [],
      onus: [],
    };

    const mockPort1: PonPort = {
      id: 'port-hf-1',
      oltId: mockHisfocusOlt.id,
      slot: 0,
      port: 1,
      label: 'EPON0/1',
      olt: mockHisfocusOlt,
      onus: [],
    };

    const mockPort2: PonPort = {
      id: 'port-hf-2',
      oltId: mockHisfocusOlt.id,
      slot: 0,
      port: 2,
      label: 'EPON0/2',
      olt: mockHisfocusOlt,
      onus: [],
    };

    const mockAcsDevicePort1: Device = {
      id: 'dev-hf-p1',
      genieId: '00259E-HG8245H5-P1',
      serial: 'HWTC112244',
      mac: '00:25:9E:AA:BB:11',
      oui: '00259E',
      productClass: 'HG8245H5',
      manufacturer: 'Huawei',
      model: 'HG8245H5',
      firmware: 'V5R019',
      profileId: null,
      profile: null,
      customerId: null,
      customer: null,
      status: 'ONLINE' as any,
      wanIp: '10.10.20.10',
      rxPowerAcs: '-18.50',
      uptime: 5000,
      lastInform: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAcsDevicePort2: Device = {
      id: 'dev-hf-p2',
      genieId: '0015EB-F670L-P2',
      serial: 'ZTEGC998877',
      mac: '00:15:EB:CC:DD:22',
      oui: '0015EB',
      productClass: 'F670L',
      manufacturer: 'ZTE',
      model: 'ZXHN F670L',
      firmware: 'V9.0',
      profileId: null,
      profile: null,
      customerId: null,
      customer: null,
      status: 'ONLINE' as any,
      wanIp: '10.10.20.20',
      rxPowerAcs: '-20.10',
      uptime: 8000,
      lastInform: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let collectedOnus: Onu[] = [];

    beforeEach(() => {
      collectedOnus = [];

      mockOltRepo = {
        find: jest.fn().mockResolvedValue([mockHisfocusOlt]),
      };

      mockPortRepo = {
        find: jest.fn().mockResolvedValue([mockPort1, mockPort2]),
        create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'port-created' })),
        save: jest.fn().mockImplementation(async (ports) => ports),
      };

      mockOnuRepo = {
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation(async (onus) => {
          collectedOnus.push(...onus);
          return onus;
        }),
      };

      mockDeviceRepo = {
        find: jest.fn().mockResolvedValue([mockAcsDevicePort1, mockAcsDevicePort2]),
      };

      mockAlertRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((dto) => dto),
        save: jest.fn().mockImplementation(async (a) => a),
      };

      collector = new OltCollectorService(
        mockOltRepo as Repository<Olt>,
        mockPortRepo as Repository<PonPort>,
        mockOnuRepo as Repository<Onu>,
        mockDeviceRepo as Repository<Device>,
        mockAlertRepo as Repository<Alert>,
      );
    });

    it('harus memilih HisfocusDriver riil untuk OLT Hisfocus 2 PON', () => {
      const driver = collector.getDriver(mockHisfocusOlt);
      expect(driver.constructor.name).toBe('HisfocusDriver');
    });

    it('harus mengumpulkan dan mengorelasikan ONU pada Port 1 dan Port 2 OLT Hisfocus', async () => {
      const mockDriver = {
        listPonPorts: jest.fn().mockResolvedValue([
          { slot: 0, port: 1, label: 'EPON0/1' },
          { slot: 0, port: 2, label: 'EPON0/2' },
        ]),
        listOnus: jest.fn().mockResolvedValue([
          // Port 1 ONU
          {
            slot: 0,
            port: 1,
            onuIndex: 1,
            mac: '00:25:9E:AA:BB:11',
            sn: 'HWTC112244',
            status: OnuStatus.ONLINE,
            rxPower: '-18.50',
            txPower: '2.15',
            distance: 950,
          },
          // Port 2 ONU
          {
            slot: 0,
            port: 2,
            onuIndex: 1,
            mac: '00:15:EB:CC:DD:22',
            sn: 'ZTEGC998877',
            status: OnuStatus.ONLINE,
            rxPower: '-20.10',
            txPower: '1.90',
            distance: 1400,
          },
        ]),
        getOnu: jest.fn(),
      };

      jest.spyOn(collector, 'getDriver').mockReturnValue(mockDriver as any);

      const total = await collector.collectFromOlt(mockHisfocusOlt);

      expect(total).toBe(2);
      expect(collectedOnus.length).toBe(2);

      // Verifikasi Port 1
      const onuP1 = collectedOnus.find((o) => o.ponPortId === mockPort1.id);
      expect(onuP1).toBeDefined();
      expect(onuP1?.deviceId).toBe(mockAcsDevicePort1.id);
      expect(onuP1?.sn).toBe('HWTC112244');
      expect(onuP1?.rxPower).toBe('-18.50');

      // Verifikasi Port 2
      const onuP2 = collectedOnus.find((o) => o.ponPortId === mockPort2.id);
      expect(onuP2).toBeDefined();
      expect(onuP2?.deviceId).toBe(mockAcsDevicePort2.id);
      expect(onuP2?.sn).toBe('ZTEGC998877');
      expect(onuP2?.rxPower).toBe('-20.10');
    });
  });
});

