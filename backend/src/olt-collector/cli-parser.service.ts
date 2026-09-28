import { Injectable } from '@nestjs/common';
import { OnuInfo } from './olt-driver.interface';
import { OnuStatus, OfflineReason } from '../olt/onu.entity';

@Injectable()
export class CliParserService {
  /**
   * Parser output baris CLI untuk OLT Hioso & Hisfocus (HSGQ)
   * Contoh baris Hioso/HSGQ:
   * "EPON0/1:1   00:25:9E:11:22:33   online      -19.45   2.10   1200"
   * "EPON0/1:2   00:25:9E:11:22:44   LOS         -        -      -"
   * "EPON0/1:3   00:25:9E:11:22:55   Dying-Gasp  -        -      -"
   */
  parseLine(line: string): OnuInfo | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---') || trimmed.toLowerCase().includes('port') || trimmed.toLowerCase().includes('index')) {
      return null;
    }

    // Regex mencocokkan: (EPON|GPON)?(slot)/(port):(index)  (MAC)  (Status/Reason)  (RX)?  (TX)?  (Dist)?
    const portMatch = trimmed.match(/(?:EPON|GPON)?(\d+)\/(\d+):(\d+)/i);
    if (!portMatch) {
      return null;
    }

    const slot = parseInt(portMatch[1], 10);
    const port = parseInt(portMatch[2], 10);
    const onuIndex = parseInt(portMatch[3], 10);

    // Ekstrak MAC Address jika ada (format XX:XX:XX:XX:XX:XX atau XXXX-XXXX-XXXX)
    let mac: string | null = null;
    const macMatch = trimmed.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
    if (macMatch) {
      mac = macMatch[0].toUpperCase();
    }

    // Tentukan status dan offline reason
    const lower = trimmed.toLowerCase();
    let status = OnuStatus.OFFLINE;
    let offlineReason: OfflineReason | null = null;

    if (lower.includes('online') || lower.includes('working') || lower.includes('active')) {
      status = OnuStatus.ONLINE;
      offlineReason = null;
    } else if (lower.includes('dying') || lower.includes('gasp') || lower.includes('poweroff') || lower.includes('power-off')) {
      status = OnuStatus.OFFLINE;
      offlineReason = OfflineReason.DYING_GASP;
    } else if (lower.includes('los') || lower.includes('fiber') || lower.includes('link-loss') || lower.includes('broken')) {
      status = OnuStatus.OFFLINE;
      offlineReason = OfflineReason.LOS;
    } else {
      status = OnuStatus.OFFLINE;
      offlineReason = OfflineReason.UNKNOWN;
    }

    // Ekstrak RX Power (misal: -19.45 atau -22.50)
    let rxPower: string | null = null;
    const rxMatch = trimmed.match(/-(\d{1,2}\.\d{1,2})/);
    if (rxMatch) {
      rxPower = `-${rxMatch[1]}`;
    }

    // Ekstrak Jarak (misal: 1200m atau angka di akhir)
    let distance: number | null = null;
    const distMatch = trimmed.match(/\b(\d{2,5})(?:m|M)?\b(?:\s*$)/);
    if (distMatch) {
      distance = parseInt(distMatch[1], 10);
    }

    return {
      slot,
      port,
      onuIndex,
      mac,
      sn: null,
      name: `ONU-${slot}/${port}:${onuIndex}`,
      status,
      offlineReason,
      rxPower,
      distance,
    };
  }

  /**
   * Parse keseluruhan output blok CLI OLT
   */
  parseOutput(cliOutput: string): OnuInfo[] {
    const lines = cliOutput.split('\n');
    const results: OnuInfo[] = [];

    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (parsed) {
        results.push(parsed);
      }
    }

    return results;
  }
}
