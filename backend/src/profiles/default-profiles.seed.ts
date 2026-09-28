import { DeviceProfileParams, DeviceProfileCapabilities } from './device-profile.entity';

export interface ProfileSeedItem {
  name: string;
  manufacturer: string;
  oui: string;
  productClass: string;
  firmwarePattern?: string | null;
  rootModel: 'TR098' | 'TR181';
  params: DeviceProfileParams;
  capabilities: DeviceProfileCapabilities;
}

/**
 * Common Base TR-098 Paths for Huawei EchoLife Series
 */
const HUAWEI_COMMON_PARAMS: DeviceProfileParams = {
  ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
  wifiPass24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
  wifiEnable24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
  rxPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
  txPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower',
  pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
  pppoePass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
  wanIP: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
  wanVlan: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.X_HW_VLAN',
  uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
  hosts: 'InternetGatewayDevice.LANDevice.1.Hosts.Host',
  reboot: 'InternetGatewayDevice.DeviceInfo.Reboot',
  factoryReset: 'InternetGatewayDevice.DeviceInfo.Reset',
};

const DEFAULT_CAPABILITIES_SINGLE_BAND: DeviceProfileCapabilities = {
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
};

const DEFAULT_CAPABILITIES_DUAL_BAND: DeviceProfileCapabilities = {
  ...DEFAULT_CAPABILITIES_SINGLE_BAND,
  wifi5g: true,
};

const DEFAULT_CAPABILITIES_BRIDGE: DeviceProfileCapabilities = {
  reboot: true,
  factoryReset: true,
  wifi: false,
  wifi5g: false,
  pppoe: false,
  firmware: true,
  ping: true,
  traceroute: false,
  hosts: false,
  rxPower: true,
};

export const DEFAULT_PROFILES_SEED: ProfileSeedItem[] = [
  // ===========================================================================
  // 1. HUAWEI ECHOLIFE HG8245H5 / HG8245H (Sangat Populer di ISP / RT-RW Net)
  // ===========================================================================
  {
    name: 'Huawei EchoLife HG8245H5',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8245H5',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
      rxPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Huawei EchoLife HG8245H',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8245H',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },

  // ===========================================================================
  // 2. HUAWEI ECHOLIFE HG8546M / HG8546M5 (Single Port GE + 3 FE / 1 GE + 1 FE)
  // ===========================================================================
  {
    name: 'Huawei EchoLife HG8546M',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8546M',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Huawei EchoLife HG8546M5',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8546M5',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },

  // ===========================================================================
  // 3. HUAWEI DUAL BAND: EG8145V5 / EG8141A5 (AC 1200 Dual-band 2.4G & 5G)
  // ===========================================================================
  {
    name: 'Huawei OptiXstar EG8145V5 Dual-Band',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'EG8145V5',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
      ssid5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      wifiPass5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
      wifiEnable5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable',
    },
    capabilities: DEFAULT_CAPABILITIES_DUAL_BAND,
  },
  {
    name: 'Huawei OptiXstar EG8141A5 Dual-Band',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'EG8141A5',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
      ssid5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.SSID',
      wifiPass5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.PreSharedKey.1.KeyPassphrase',
      wifiEnable5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.5.Enable',
    },
    capabilities: DEFAULT_CAPABILITIES_DUAL_BAND,
  },

  // ===========================================================================
  // 4. HUAWEI LEGACY / SPECIAL (HG8245A, HG8245C, HG8120C)
  // ===========================================================================
  {
    name: 'Huawei EchoLife HG8245A',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8245A',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Huawei EchoLife HG8245C',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8245C',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Huawei EchoLife HG8120C (Bridge / 1GE + 1FE)',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8120C',
    rootModel: 'TR098',
    params: {
      ...HUAWEI_COMMON_PARAMS,
      ssid24: undefined,
      wifiPass24: undefined,
    },
    capabilities: {
      ...DEFAULT_CAPABILITIES_SINGLE_BAND,
      wifi: false,
    },
  },

  // ===========================================================================
  // 5. HUAWEI BRIDGE ONU (HG8310M / HG8010H)
  // ===========================================================================
  {
    name: 'Huawei EchoLife HG8310M (Bridge)',
    manufacturer: 'Huawei',
    oui: '00259E',
    productClass: 'HG8310M',
    rootModel: 'TR098',
    params: {
      rxPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
      txPower: 'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TXPower',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
      reboot: 'InternetGatewayDevice.DeviceInfo.Reboot',
      factoryReset: 'InternetGatewayDevice.DeviceInfo.Reset',
    },
    capabilities: DEFAULT_CAPABILITIES_BRIDGE,
  },

  // ===========================================================================
  // 6. ZIMLINK EPON / XPON (TODO(verify) spesifik per dump)
  // ===========================================================================
  {
    name: 'Zimlink XPON ZM-G100/ZM-100',
    manufacturer: 'Zimlink',
    oui: 'TODO(verify)', // OUI Zimlink akan diisi otomatis saat perangkat pertama inform
    productClass: 'ZM-G100',
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifiPass24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      wifiEnable24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      rxPower: 'InternetGatewayDevice.WANDevice.1.X_CT-COM_Gpon.RxPower', // TODO(verify)
      pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Zimlink Dual Band ZM-G200',
    manufacturer: 'Zimlink',
    oui: 'TODO(verify)',
    productClass: 'ZM-G200',
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifiPass24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      ssid5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID', // TODO(verify): index 2 atau 5
      wifiPass5: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.PreSharedKey.1.KeyPassphrase',
      rxPower: 'InternetGatewayDevice.WANDevice.1.X_CT-COM_Gpon.RxPower',
      pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
    },
    capabilities: DEFAULT_CAPABILITIES_DUAL_BAND,
  },

  // ===========================================================================
  // 7. GENERIC FALLBACK PROFILES (TR-098 & TR-181)
  // ===========================================================================
  {
    name: 'Generic TR-098 Standard Gateway',
    manufacturer: 'Generic',
    oui: 'GENERIC-TR098',
    productClass: 'GENERIC',
    rootModel: 'TR098',
    params: {
      ssid24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
      wifiPass24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
      wifiEnable24: 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.Enable',
      pppoeUser: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
      pppoePass: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Password',
      wanIP: 'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.ExternalIPAddress',
      uptime: 'InternetGatewayDevice.DeviceInfo.UpTime',
    },
    capabilities: DEFAULT_CAPABILITIES_SINGLE_BAND,
  },
  {
    name: 'Generic TR-181 Device Gateway',
    manufacturer: 'Generic',
    oui: 'GENERIC-TR181',
    productClass: 'GENERIC',
    rootModel: 'TR181',
    params: {
      ssid24: 'Device.WiFi.SSID.1.SSID',
      wifiPass24: 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
      wifiEnable24: 'Device.WiFi.SSID.1.Enable',
      ssid5: 'Device.WiFi.SSID.2.SSID',
      wifiPass5: 'Device.WiFi.AccessPoint.2.Security.KeyPassphrase',
      wifiEnable5: 'Device.WiFi.SSID.2.Enable',
      pppoeUser: 'Device.PPP.Interface.1.Username',
      pppoePass: 'Device.PPP.Interface.1.Password',
      wanIP: 'Device.IP.Interface.1.IPv4Address.1.IPAddress',
      uptime: 'Device.DeviceInfo.UpTime',
      rxPower: 'Device.Optical.Interface.1.OpticalSignalLevel',
    },
    capabilities: DEFAULT_CAPABILITIES_DUAL_BAND,
  },
];
