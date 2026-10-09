// ============================================================================
// POP SERVER / NETWORK FACILITY & ENCLOSURE DATA MODEL
// ============================================================================

export interface PopPowerSystem {
  plnStatus: 'NORMAL' | 'BLACKOUT';
  plnVoltage: number; // e.g. 220 Volt
  batteryType: string; // e.g. 'LiFePO4 Lithium (48V)' | 'VRLA Deep Cycle Gel (48V)'
  batteryVoltage: number; // e.g. 53.5 Volt
  batteryCapacityAh: number; // e.g. 100 Ah
  batterySocPercent: number; // e.g. 96%
  backupEstimatedMinutes: number; // e.g. 420 menit (7 jam)
  upsStatus: 'ONLINE' | 'BATTERY_MODE' | 'BYPASS' | 'FAULT';
  upsLoadWatt: number; // e.g. 280 Watt
  upsLoadPercent: number; // e.g. 35%
}

export interface PopNetworkDevice {
  id: string;
  name: string;
  category: 'OLT' | 'ROUTER' | 'SWITCH' | 'SERVER' | 'ODF' | 'UPS';
  vendor: string;
  model: string;
  ipAddress?: string;
  webPort?: number;
  cliPort?: number;
  rackUnitPosition?: string; // e.g. "U12 - U14"
  status: 'ONLINE' | 'WARNING' | 'OFFLINE';
  portsTotal?: number;
  portsUsed?: number;
  details?: Record<string, any>;
}

export interface PopServerFacility {
  id: string;
  name: string;
  code?: string; // e.g. "POP-01"
  address?: string;
  rackUnitsTotal: number; // e.g. 42U
  rackUnitsUsed: number;
  temperature?: number; // e.g. 23.5 °C
  humidity?: number; // e.g. 52%
  doorStatus?: 'LOCKED' | 'OPEN';
  powerSystem?: PopPowerSystem;
  devices: PopNetworkDevice[];
}
