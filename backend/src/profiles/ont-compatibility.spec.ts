import { ProfileResolverService } from './profile-resolver.service';
import { DeviceProfile } from './device-profile.entity';
import { DEFAULT_PROFILES_SEED } from './default-profiles.seed';
import { Repository } from 'typeorm';

describe('Uji Kompatibilitas ONT (Optical Network Terminal)', () => {
  let service: ProfileResolverService;
  let inMemoryProfiles: DeviceProfile[];
  let mockRepo: Partial<Repository<DeviceProfile>>;

  beforeAll(() => {
    // Bangun database in-memory dari DEFAULT_PROFILES_SEED
    inMemoryProfiles = DEFAULT_PROFILES_SEED.map((seed, idx) => ({
      id: `profile-${idx + 1}`,
      name: seed.name,
      manufacturer: seed.manufacturer,
      oui: seed.oui,
      productClass: seed.productClass,
      firmwarePattern: seed.firmwarePattern || null,
      rootModel: seed.rootModel,
      params: seed.params,
      capabilities: seed.capabilities,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn().mockImplementation(async (opts: any) => {
        const where = opts?.where;
        if (!where) return null;

        return inMemoryProfiles.find((p) => {
          if (where.oui && where.productClass) {
            return p.oui === where.oui && p.productClass === where.productClass;
          }
          if (where.productClass && where.rootModel) {
            return p.productClass === where.productClass && p.rootModel === where.rootModel;
          }
          if (where.productClass) {
            return p.productClass === where.productClass;
          }
          if (where.name) {
            return p.name === where.name;
          }
          return false;
        }) || null;
      }),

      createQueryBuilder: jest.fn().mockImplementation(() => {
        return {
          where: jest.fn().mockImplementation(function (this: any, sql: string, params: any) {
            this._sql = sql;
            this._params = params;
            return this;
          }),
          getOne: jest.fn().mockImplementation(function (this: any) {
            const pc = (this._params?.pc || '').toLowerCase();
            return inMemoryProfiles.find((p) => {
              const pClass = p.productClass.toLowerCase();
              const pName = p.name.toLowerCase();
              return pClass === pc || pc.includes(pClass) || pName.includes(pc);
            }) || null;
          }),
        };
      }),
    };

    service = new ProfileResolverService(mockRepo as Repository<DeviceProfile>);
  });

  describe('1. Kompatibilitas ONT Huawei (EchoLife & OptiXstar Series)', () => {
    it('harus mendukung Huawei HG8245H5 (Single-Band, TR-098, GPON RxPower)', async () => {
      const res = await service.resolve({
        oui: '00259E',
        productClass: 'HG8245H5',
        manufacturer: 'Huawei',
      });

      expect(res.status).toBe('matched');
      expect(res.profile?.productClass).toBe('HG8245H5');
      expect(res.params.rxPower).toBe('InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower');
      expect(res.params.pppoeUser).toBe('InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username');
      expect(res.capabilities.wifi).toBe(true);
      expect(res.capabilities.wifi5g).toBe(false);
      expect(res.capabilities.rxPower).toBe(true);
      expect(res.capabilities.reboot).toBe(true);
    });

    it('harus mendukung Huawei EG8145V5 / EG8141A5 (Dual-Band 2.4G & 5G AC)', async () => {
      const res = await service.resolve({
        oui: '00259E',
        productClass: 'EG8145V5',
        manufacturer: 'Huawei Technologies',
      });

      expect(res.status).toBe('matched');
      expect(res.capabilities.wifi5g).toBe(true);
      expect(res.params.ssid5).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID');
      expect(res.params.wifiPass5).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase');
    });

    it('harus mendukung Huawei HG8310M Bridge ONU (Tanpa Wi-Fi / PPPoE, RX Power Aktif)', async () => {
      const res = await service.resolve({
        oui: '00259E',
        productClass: 'HG8310M',
        manufacturer: 'Huawei',
      });

      expect(res.status).toBe('matched');
      expect(res.capabilities.wifi).toBe(false);
      expect(res.capabilities.pppoe).toBe(false);
      expect(res.capabilities.rxPower).toBe(true);
      expect(res.capabilities.reboot).toBe(true);
    });
  });

  describe('2. Kompatibilitas ONT ZTE (ZXHN F609 & F670L Series)', () => {
    it('harus mendukung ZTE ZXHN F609 (Single-Band, X_ZTE-COM_PON.RxPower)', async () => {
      const res = await service.resolve({
        oui: '0015EB',
        productClass: 'F609',
        manufacturer: 'ZTE Corporation',
      });

      expect(res.status).toBe('matched');
      expect(res.profile?.productClass).toBe('F609');
      expect(res.params.rxPower).toBe('InternetGatewayDevice.WANDevice.1.X_ZTE-COM_PON.RxPower');
      expect(res.params.txPower).toBe('InternetGatewayDevice.WANDevice.1.X_ZTE-COM_PON.TxPower');
      expect(res.capabilities.wifi).toBe(true);
      expect(res.capabilities.wifi5g).toBe(false);
    });

    it('harus mengenali ZTE dengan format ProductClass kompleks seperti "ZXHN F609 v5.2"', async () => {
      const res = await service.resolve({
        productClass: 'ZXHN F609',
        manufacturer: 'ZTE',
      });

      expect(res.status).toBe('matched');
      expect(res.profile?.productClass).toBe('F609');
      expect(res.capabilities.wifi).toBe(true);
    });

    it('harus mendukung ZTE ZXHN F670L (Dual-Band AC, 2.4G & 5G)', async () => {
      const res = await service.resolve({
        oui: '0015EB',
        productClass: 'F670L',
        manufacturer: 'ZTE',
      });

      expect(res.status).toBe('matched');
      expect(res.capabilities.wifi5g).toBe(true);
      expect(res.params.ssid5).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID');
      expect(res.params.wifiPass5).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase');
    });

    it('harus fallback ke ZTE default jika ProductClass tidak spesifik tapi vendor ZTE', async () => {
      const res = await service.resolve({
        manufacturer: 'ZTE Corporation',
        productClass: 'UNKNOWN_ZTE_MODEL',
      });

      expect(res.status).toBe('matched');
      expect(res.profile?.manufacturer).toBe('ZTE');
    });
  });

  describe('3. Kompatibilitas ONT Fiberhome (HG6245D & AN5506 Series)', () => {
    it('harus mendukung Fiberhome HG6245D (Dual-Band AC)', async () => {
      const res = await service.resolve({
        oui: '000FE2',
        productClass: 'HG6245D',
        manufacturer: 'Fiberhome',
      });

      expect(res.status).toBe('matched');
      expect(res.profile?.productClass).toBe('HG6245D');
      expect(res.capabilities.wifi5g).toBe(true);
      expect(res.params.rxPower).toBe('InternetGatewayDevice.WANDevice.1.X_CT-COM_Gpon.RxPower');
    });

    it('harus mendukung Fiberhome AN5506-04-F (Single-Band)', async () => {
      const res = await service.resolve({
        oui: '000FE2',
        productClass: 'AN5506-04-F',
        manufacturer: 'Fiberhome',
      });

      expect(res.status).toBe('matched');
      expect(res.capabilities.wifi5g).toBe(false);
      expect(res.capabilities.wifi).toBe(true);
    });
  });

  describe('4. Kompatibilitas ONT Zimlink & VSOL XPON', () => {
    it('harus mendukung Zimlink ZM-G100 & ZM-G200', async () => {
      const resSingle = await service.resolve({
        productClass: 'ZM-G100',
        manufacturer: 'Zimlink',
      });
      expect(resSingle.status).toBe('matched');
      expect(resSingle.capabilities.wifi5g).toBe(false);

      const resDual = await service.resolve({
        productClass: 'ZM-G200',
        manufacturer: 'Zimlink',
      });
      expect(resDual.status).toBe('matched');
      expect(resDual.capabilities.wifi5g).toBe(true);
    });

    it('harus mendukung VSOL V2801SG (1GE XPON Bridge) dan V2804REWT (Dual Band)', async () => {
      const resBridge = await service.resolve({
        oui: '001337',
        productClass: 'V2801SG',
        manufacturer: 'VSOL',
      });
      expect(resBridge.status).toBe('matched');
      expect(resBridge.capabilities.wifi).toBe(false);

      const resRouter = await service.resolve({
        oui: '001337',
        productClass: 'V2804REWT',
        manufacturer: 'VSOL',
      });
      expect(resRouter.status).toBe('matched');
      expect(resRouter.capabilities.wifi5g).toBe(true);
    });
  });

  describe('5. Fallback ke Standar Generic TR-098 & TR-181', () => {
    it('harus menggunakan Generic TR-098 jika perangkat belum memiliki profil khusus', async () => {
      const res = await service.resolve({
        oui: 'FFFFFF',
        productClass: 'CUSTOM_UNKNOWN_ONT',
        manufacturer: 'Unknown Brand',
      });

      expect(res.status).toBe('fallback_generic');
      expect(res.profile?.productClass).toBe('GENERIC');
      expect(res.params.ssid24).toBe('InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID');
      expect(res.capabilities.wifi).toBe(true);
    });
  });
});
