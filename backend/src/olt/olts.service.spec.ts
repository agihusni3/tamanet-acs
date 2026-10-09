import { OltsService } from './olts.service';
import { Olt, PonType } from './olt.entity';
import { PonPort } from './pon-port.entity';
import { Onu, OnuStatus } from './onu.entity';

describe('OltsService', () => {
  let service: OltsService;
  let mockOltRepo: any;
  let mockPortRepo: any;
  let mockOnuRepo: any;

  beforeEach(() => {
    mockOltRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ id: 'olt-123', ...dto })),
      save: jest.fn(async (entity) => ({ id: 'olt-123', ...entity })),
      remove: jest.fn(),
    };
    mockPortRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity) => entity),
    };
    mockOnuRepo = {};

    service = new OltsService(mockOltRepo, mockPortRepo, mockOnuRepo);
  });

  it('harus menyamarkan password OLT (masked) pada respon findAll', async () => {
    const rawOlt: any = {
      id: 'olt-hioso-1',
      name: 'OLT Utama Hioso',
      vendor: 'Hioso',
      model: 'HA7302CST',
      ip: '192.168.10.2',
      webPort: 80,
      cliPort: 23,
      ponType: PonType.EPON,
      ponPortsCount: 2,
      snmpCommunity: 'public',
      defaultUser: 'admin',
      defaultPass: 'SuperSecretOltPassword!123',
      uptime: '10h 4j',
      ports: [
        {
          id: 'p1',
          port: 1,
          label: 'EPON0/1',
          onus: [
            { id: 'o1', status: OnuStatus.ONLINE },
            { id: 'o2', status: OnuStatus.OFFLINE },
          ],
        },
        {
          id: 'p2',
          port: 2,
          label: 'EPON0/2',
          onus: [],
        },
      ],
    };

    mockOltRepo.find.mockResolvedValue([rawOlt]);

    const result = await service.findAll();
    expect(result.length).toBe(1);

    const oltRes = result[0];
    expect(oltRes.id).toBe('olt-hioso-1');
    expect(oltRes.name).toBe('OLT Utama Hioso');

    // Keamanan: Password asli TIDAK BOLEH muncul di respons
    expect(oltRes.defaultPass).not.toBe('SuperSecretOltPassword!123');
    expect(oltRes.defaultPass).toBe('••••••••');
    expect(oltRes.hasPassword).toBe(true);

    // Verifikasi statistik port
    expect(oltRes.totalOnu).toBe(2);
    expect(oltRes.onlineOnu).toBe(1);
    expect(oltRes.offlineOnu).toBe(1);
  });

  it('harus memvalidasi create OLT baru dengan 2 port default', async () => {
    const dto = {
      name: 'Hioso Baru',
      vendor: 'Hioso',
      model: '2P1G',
      ip: '192.168.10.15',
      defaultUser: 'admin',
      defaultPass: 'admin123',
    };

    const savedOltResult: any = {
      id: 'olt-123',
      name: 'Hioso Baru',
      vendor: 'Hioso',
      model: '2P1G',
      ip: '192.168.10.15',
      ponType: PonType.EPON,
      ponPortsCount: 2,
      defaultUser: 'admin',
      defaultPass: 'admin123',
      ports: [
        { id: 'p1', port: 1, label: 'EPON0/1', onus: [] },
        { id: 'p2', port: 2, label: 'EPON0/2', onus: [] },
      ],
    };

    mockOltRepo.findOne.mockResolvedValue(savedOltResult);

    const created = await service.create(dto);
    expect(mockOltRepo.create).toHaveBeenCalled();
    expect(mockOltRepo.save).toHaveBeenCalled();
    expect(created.name).toBe('Hioso Baru');
    expect(created.defaultPass).toBe('••••••••');
  });

  it('harus menyimpan keterangan area pada port PON saat create dan updatePort', async () => {
    const mockPort = {
      id: 'p1',
      oltId: 'olt-123',
      port: 1,
      label: 'PON 1',
      description: 'Area Melati RW 01',
    };
    mockPortRepo.findOne = jest.fn().mockResolvedValue(mockPort);

    const savedOltResult: any = {
      id: 'olt-123',
      name: 'OLT Wilayah A',
      vendor: 'Hisfocus',
      model: '2P1G',
      ip: '192.168.1.100',
      ponType: PonType.EPON,
      ponPortsCount: 1,
      ports: [
        { id: 'p1', port: 1, label: 'PON 1', description: 'Area Mawar RW 02', onus: [] },
      ],
    };
    mockOltRepo.findOne.mockResolvedValue(savedOltResult);

    const updated = await service.updatePort('olt-123', 1, {
      description: 'Area Mawar RW 02',
    });

    expect(mockPortRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Area Mawar RW 02',
      }),
    );
    expect(updated.ponPorts[0].description).toBe('Area Mawar RW 02');
  });
});
