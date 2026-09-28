import { CliParserService } from './cli-parser.service';
import { OnuStatus, OfflineReason } from '../olt/onu.entity';

describe('CliParserService', () => {
  let service: CliParserService;

  beforeEach(() => {
    service = new CliParserService();
  });

  it('harus mem-parse baris ONU status online dengan sinyal optik dan MAC address', () => {
    const line = 'EPON0/1:1   00:25:9E:11:22:33   online      -19.45(dBm)   2.10(dBm)   1250m';
    const res = service.parseLine(line);

    expect(res).not.toBeNull();
    expect(res?.slot).toBe(0);
    expect(res?.port).toBe(1);
    expect(res?.onuIndex).toBe(1);
    expect(res?.mac).toBe('00:25:9E:11:22:33');
    expect(res?.status).toBe(OnuStatus.ONLINE);
    expect(res?.offlineReason).toBeNull();
    expect(res?.rxPower).toBe('-19.45');
    expect(res?.distance).toBe(1250);
  });

  it('harus mendeteksi alasan offline LOS (Loss of Signal / kabel putus)', () => {
    const line = 'EPON0/1:2   00:25:9E:AA:BB:CC   LOS         -             -           -';
    const res = service.parseLine(line);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(OnuStatus.OFFLINE);
    expect(res?.offlineReason).toBe(OfflineReason.LOS);
    expect(res?.rxPower).toBeNull();
  });

  it('harus mendeteksi alasan offline Dying-Gasp (listrik padam di pelanggan)', () => {
    const line = 'EPON0/2:5   00:25:9E:DD:EE:FF   Dying-Gasp  -             -           -';
    const res = service.parseLine(line);

    expect(res).not.toBeNull();
    expect(res?.status).toBe(OnuStatus.OFFLINE);
    expect(res?.offlineReason).toBe(OfflineReason.DYING_GASP);
  });

  it('harus mem-parse multiline output OLT secara menyeluruh', () => {
    const multiLine = `
      Port        MAC                 Status      RX Power      TX Power    Distance
      -----------------------------------------------------------------------------
      EPON0/1:1   00:25:9E:11:22:01   online      -21.20        2.00        850
      EPON0/1:2   00:25:9E:11:22:02   LOS         -             -           -
      EPON0/1:3   00:25:9E:11:22:03   Dying-Gasp  -             -           -
    `;

    const results = service.parseOutput(multiLine);
    expect(results.length).toBe(3);
    expect(results[0].status).toBe(OnuStatus.ONLINE);
    expect(results[1].offlineReason).toBe(OfflineReason.LOS);
    expect(results[2].offlineReason).toBe(OfflineReason.DYING_GASP);
  });
});
