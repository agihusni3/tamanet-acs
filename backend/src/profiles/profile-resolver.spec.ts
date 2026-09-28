import { ProfileResolverService } from './profile-resolver.service';
import { DeviceProfile } from './device-profile.entity';
import { Repository } from 'typeorm';

describe('ProfileResolverService', () => {
  let service: ProfileResolverService;
  let mockRepo: Partial<Repository<DeviceProfile>>;

  const mockHuaweiHG8245H5: DeviceProfile = {
    id: 'uuid-1',
    name: 'Huawei EchoLife HG8245H5',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8245H5',
    firmwarePattern: null,
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      rxPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
      pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
    },
    capabilities: {
      reboot: true,
      factoryReset: true,
      wifi: true,
      wifi5g: false,
      pppoe: true,
      firmware: true,
      ping: true,
      traceroute: false,
      hosts: true,
      rxPower: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGenericProfile: DeviceProfile = {
    id: 'uuid-gen',
    name: 'Generic TR-098 Standard Gateway',
    manufacturer: 'Generic',
    oui: 'GENERIC-TR098',
    productClass: 'GENERIC',
    firmwarePattern: null,
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    },
    capabilities: {
      reboot: true,
      factoryReset: false,
      wifi: true,
      wifi5g: false,
      pppoe: true,
      firmware: false,
      ping: false,
      traceroute: false,
      hosts: false,
      rxPower: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn().mockImplementation(async (opts: any) => {
        const where = opts?.where;
        if (where?.oui === '00259E' && where?.productClass === 'HG8245H5') {
          return mockHuaweiHG8245H5;
        }
        if (where?.productClass === 'HG8245H5') {
          return mockHuaweiHG8245H5;
        }
        if (where?.productClass === 'GENERIC') {
          return mockGenericProfile;
        }
        return null;
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockImplementation(async () => null),
      }),
    };

    service = new ProfileResolverService(mockRepo as Repository<DeviceProfile>);
  });

  it('harus mencocokkan profile Huawei HG8245H5 dengan tepat via OUI & ProductClass', async () => {
    const res = await service.resolve({
      oui: '00259E',
      productClass: 'HG8245H5',
    });

    expect(res.status).toBe('matched');
    expect(res.profile?.name).toBe('Huawei EchoLife HG8245H5');
    expect(res.params.ssid24).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
    expect(res.capabilities.wifi).toBe(true);
  });

  it('harus fallback ke Huawei HG8245H5 jika manufacturer terdeteksi Huawei namun OUI berbeda', async () => {
    const res = await service.resolve({
      manufacturer: 'Huawei Technologies Co., Ltd',
      productClass: 'UNKNOWN_SERIES',
    });

    expect(res.status).toBe('matched');
    expect(res.profile?.productClass).toBe('HG8245H5');
  });

  it('harus menggunakan generic fallback jika perangkat sama sekali tidak dikenal', async () => {
    const res = await service.resolve({
      oui: 'AABBCC',
      productClass: 'UNKNOWN_DEVICE_99',
    });

    expect(res.status).toBe('fallback_generic');
    expect(res.profile?.productClass).toBe('GENERIC');
  });

  it('harus mengembalikan status profile_missing dengan aman jika generic pun tidak ada, bukan error', async () => {
    mockRepo.findOne = jest.fn().mockResolvedValue(null);

    const res = await service.resolve({
      oui: 'UNKNOWN',
      productClass: 'UNKNOWN',
    });

    expect(res.status).toBe('profile_missing');
    expect(res.profile).toBeNull();
    expect(res.capabilities.reboot).toBe(false);
  });
});
