import { OltDriver, OnuInfo, PonPortInfo } from './olt-driver.interface';
import { OnuStatus, OfflineReason } from '../olt/onu.entity';

export class MockOltDriver implements OltDriver {
  constructor(private readonly oltName: string) {}

  async listPonPorts(): Promise<PonPortInfo[]> {
    return [
      { slot: 0, port: 1, label: 'EPON0/1' },
      { slot: 0, port: 2, label: 'EPON0/2' },
      { slot: 0, port: 3, label: 'EPON0/3' },
      { slot: 0, port: 4, label: 'EPON0/4' },
    ];
  }

  async listOnus(): Promise<OnuInfo[]> {
    return [
      {
        slot: 0,
        port: 1,
        onuIndex: 1,
        mac: '00:25:9E:AA:11:01',
        name: 'Pelanggan-01',
        status: OnuStatus.ONLINE,
        rxPower: '-19.20',
        txPower: '2.15',
        distance: 850,
      },
      {
        slot: 0,
        port: 1,
        onuIndex: 2,
        mac: '00:25:9E:AA:11:02',
        name: 'Pelanggan-02',
        status: OnuStatus.ONLINE,
        rxPower: '-24.80',
        txPower: '1.95',
        distance: 1420,
      },
      {
        slot: 0,
        port: 1,
        onuIndex: 3,
        mac: '00:25:9E:AA:11:03',
        name: 'Pelanggan-03',
        status: OnuStatus.OFFLINE,
        offlineReason: OfflineReason.LOS,
        rxPower: null,
        distance: 920,
      },
      {
        slot: 0,
        port: 2,
        onuIndex: 1,
        mac: '00:25:9E:BB:22:01',
        name: 'Pelanggan-04',
        status: OnuStatus.OFFLINE,
        offlineReason: OfflineReason.DYING_GASP,
        rxPower: null,
        distance: 1800,
      },
    ];
  }

  async getOnu(ref: { slot: number; port: number; onuIndex: number }): Promise<OnuInfo | null> {
    const all = await this.listOnus();
    return all.find((o) => o.slot === ref.slot && o.port === ref.port && o.onuIndex === ref.onuIndex) || null;
  }
}
