import { OnuStatus, OfflineReason } from '../olt/onu.entity';

export interface OnuInfo {
  slot: number;
  port: number;
  onuIndex: number;
  mac?: string | null;
  sn?: string | null;
  name?: string | null;
  status: OnuStatus;
  offlineReason?: OfflineReason | null;
  rxPower?: string | null; // e.g. "-19.45" dBm
  txPower?: string | null; // e.g. "2.10" dBm
  distance?: number | null; // meters
}

export interface PonPortInfo {
  slot: number;
  port: number;
  label: string;
}

export interface OltDriver {
  listOnus(): Promise<OnuInfo[]>;
  getOnu(ref: { slot: number; port: number; onuIndex: number }): Promise<OnuInfo | null>;
  listPonPorts(): Promise<PonPortInfo[]>;
}
