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

    // Ekstrak MAC Address jika ada (format XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, atau XXXX.XXXX.XXXX)
    let mac: string | null = null;
    const macMatch = trimmed.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
    if (macMatch) {
      mac = macMatch[0].toUpperCase();
    } else {
      const dotMacMatch = trimmed.match(/([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})\.([0-9A-Fa-f]{4})/);
      if (dotMacMatch) {
        const p1 = dotMacMatch[1];
        const p2 = dotMacMatch[2];
        const p3 = dotMacMatch[3];
        mac = `${p1.slice(0, 2)}:${p1.slice(2, 4)}:${p2.slice(0, 2)}:${p2.slice(2, 4)}:${p3.slice(0, 2)}:${p3.slice(2, 4)}`.toUpperCase();
      }
    }

    // Ekstrak GPON Serial Number (misal: HWTC12345678, ZTEGC1234567, VSOL12345678, FHTT12345678)
    let sn: string | null = null;
    const gponSnMatch = trimmed.match(/\b([A-Za-z]{4}[0-9A-Fa-f]{8})\b/);
    if (gponSnMatch) {
      sn = gponSnMatch[1].toUpperCase();
    } else {
      const explicitSnMatch = trimmed.match(/(?:SN|Serial|SN:)\s*[:=]?\s*([A-Za-z0-9]{8,16})/i);
      if (explicitSnMatch) {
        sn = explicitSnMatch[1].toUpperCase();
      }
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

    // Ekstrak TX Power (misal: 2.10 atau +2.50 yang mengikuti RX)
    let txPower: string | null = null;
    if (rxPower) {
      const afterRx = trimmed.slice(trimmed.indexOf(rxPower) + rxPower.length);
      const txMatch = afterRx.match(/\s+([+]?\d{1,2}\.\d{1,2})\b/);
      if (txMatch) {
        txPower = txMatch[1];
      }
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
      sn,
      name: `ONU-${slot}/${port}:${onuIndex}`,
      status,
      offlineReason,
      rxPower,
      txPower,
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
