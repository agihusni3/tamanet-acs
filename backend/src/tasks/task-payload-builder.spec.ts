import { TaskPayloadBuilderService } from './task-payload-builder.service';
import { DeviceProfile } from '../profiles/device-profile.entity';
import { UnprocessableEntityException } from '@nestjs/common';

describe('TaskPayloadBuilderService', () => {
  let service: TaskPayloadBuilderService;

  const mockHuaweiDualBand: DeviceProfile = {
    id: 'uuid-1',
    name: 'Huawei OptiXstar EG8145V5 Dual-Band',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'EG8145V5',
    firmwarePattern: null,
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifiPass24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      ssid5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      wifiPass5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
      pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
    },
    capabilities: {
      reboot: true,
      factoryReset: true,
      wifi: true,
      wifi5g: true,
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

  const mockSingleBand: DeviceProfile = {
    ...mockHuaweiDualBand,
    name: 'Huawei EchoLife HG8245H5',
    productClass: 'HG8245H5',
    capabilities: {
      ...mockHuaweiDualBand.capabilities,
      wifi5g: false,
    },
  };

  const mockBridgeOnu: DeviceProfile = {
    ...mockHuaweiDualBand,
    name: 'Huawei EchoLife HG8310M',
    productClass: 'HG8310M',
    capabilities: {
      ...mockHuaweiDualBand.capabilities,
      wifi: false,
      wifi5g: false,
      pppoe: false,
    },
  };

  beforeEach(() => {
    service = new TaskPayloadBuilderService();
  });

  describe('buildWifiParams', () => {
    it('harus berhasil membuat parameter setParameterValues untuk Wi-Fi 2.4 GHz', () => {
      const res = service.buildWifiParams(mockHuaweiDualBand, {
        band: '2.4',
        ssid: 'MyWiFi-Home',
        password: 'password12345',
      });

      expect(res).toEqual([
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID', 'MyWiFi-Home', 'xsd:string'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase', 'password12345', 'xsd:string'],
      ]);
    });

    it('harus berhasil membuat parameter setParameterValues untuk Wi-Fi 5 GHz pada modem dual-band', () => {
      const res = service.buildWifiParams(mockHuaweiDualBand, {
        band: '5',
        ssid: 'MyWiFi-5G',
        password: 'password5G99',
      });

      expect(res).toEqual([
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID', 'MyWiFi-5G', 'xsd:string'],
        ['InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase', 'password5G99', 'xsd:string'],
      ]);
    });

    it('harus menolak request 5 GHz jika modem hanya Single-Band dengan status 422', () => {
      expect(() => {
        service.buildWifiParams(mockSingleBand, {
          band: '5',
          ssid: 'MyWiFi-5G',
        });
      }).toThrow(UnprocessableEntityException);
    });

    it('harus menolak aksi WiFi jika perangkat adalah Bridge ONU', () => {
      expect(() => {
        service.buildWifiParams(mockBridgeOnu, {
          band: '2.4',
          ssid: 'MyWiFi',
        });
      }).toThrow(UnprocessableEntityException);
    });
  });

  describe('buildPppoeParams', () => {
    it('harus berhasil membuat parameter PPPoE', () => {
      const res = service.buildPppoeParams(mockHuaweiDualBand, {
        username: 'user01@isp',
        password: 'secretpppoepass',
      });

      expect(res).toEqual([
        ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username', 'user01@isp', 'xsd:string'],
        ['InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password', 'secretpppoepass', 'xsd:string'],
      ]);
    });

    it('harus menolak konfigurasi PPPoE jika tidak didukung kapabilitas modem', () => {
      expect(() => {
        service.buildPppoeParams(mockBridgeOnu, {
          username: 'user01@isp',
        });
      }).toThrow(UnprocessableEntityException);
    });
  });
});
