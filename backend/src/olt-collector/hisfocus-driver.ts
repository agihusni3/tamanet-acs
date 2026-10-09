import * as net from 'net';
import { Logger } from '@nestjs/common';
import { OltDriver, OnuInfo, PonPortInfo } from './olt-driver.interface';
import { CliParserService } from './cli-parser.service';
import { Olt, PonType } from '../olt/olt.entity';
import { decryptCredential } from '../common/crypto.util';

export class HisfocusDriver implements OltDriver {
  private readonly logger = new Logger(HisfocusDriver.name);
  private readonly parser = new CliParserService();

  constructor(private readonly olt: Olt) {}

  /**
   * Menentukan daftar Port PON untuk OLT Hisfocus (HSGQ) 2-PON:
   * - Default: 2 Port (EPON0/1 & EPON0/2 atau GPON0/1 & GPON0/2)
   */
  async listPonPorts(): Promise<PonPortInfo[]> {
    const portCount = this.getPonPortsCount();
    const isGpon = this.olt.ponType === PonType.GPON;
    const prefix = isGpon ? 'GPON0' : 'EPON0';
    const ports: PonPortInfo[] = [];

    for (let p = 1; p <= portCount; p++) {
      ports.push({
        slot: 0,
        port: p,
        label: `${prefix}/${p}`,
      });
    }

    return ports;
  }

  /**
   * Deteksi jumlah port PON (default 2 Port untuk Hisfocus 2 PON)
   */
  private getPonPortsCount(): number {
    if (this.olt.ponPortsCount && this.olt.ponPortsCount > 0) {
      return this.olt.ponPortsCount;
    }
    const model = (this.olt.model || '').toUpperCase();
    if (model.includes('4P') || model.includes('4-PORT') || model.includes('E04') || model.includes('G04')) {
      return 4;
    }
    if (model.includes('8P') || model.includes('8-PORT') || model.includes('E08') || model.includes('G08')) {
      return 8;
    }
    // Default standar untuk Hisfocus 2 PON (HSGQ-E02 / HSGQ-G02)
    return 2;
  }

  /**
   * Mengambil daftar seluruh ONU beserta status (online, LOS, Dying-Gasp),
   * MAC Address / GPON SN, dan sinyal optik dBm dari OLT Hisfocus (HSGQ) secara langsung via Telnet CLI.
   */
  async listOnus(): Promise<OnuInfo[]> {
    const host = this.olt.ip;
    const port = this.olt.cliPort || 23;
    const username = this.olt.cliUser || this.olt.defaultUser || 'admin';
    const rawPass = this.olt.cliPass || this.olt.defaultPass || 'admin';
    const password = decryptCredential(rawPass);

    this.logger.log(
      `[HisfocusDriver] Menghubungkan ke OLT Hisfocus '${this.olt.name}' (${this.olt.model || '2-PON'}) di ${host}:${port}...`,
    );

    // Perintah standar CLI Hisfocus / HSGQ untuk menarik data ONU dan Optik
    const commands = [
      'terminal length 0',
      'show onu info',
      'show onu opm-diag',
      'show epon onu-information',
      'show onu status',
      'show optical-power',
    ];

    try {
      const rawOutput = await this.executeTelnetCommands(host, port, username, password, commands);
      const parsedList = this.parser.parseOutput(rawOutput);

      // Gabungkan hasil jika satu ONU memiliki baris status dan baris optik terpisah
      const mergedMap = new Map<string, OnuInfo>();
      for (const item of parsedList) {
        const key = `${item.slot}/${item.port}:${item.onuIndex}`;
        const existing = mergedMap.get(key);
        if (!existing) {
          mergedMap.set(key, { ...item });
        } else {
          // Update data yang belum terisi
          if (!existing.mac && item.mac) existing.mac = item.mac;
          if (!existing.sn && item.sn) existing.sn = item.sn;
          if (item.rxPower) existing.rxPower = item.rxPower;
          if (item.txPower) existing.txPower = item.txPower;
          if (item.distance != null) existing.distance = item.distance;
          if (item.status && item.status !== existing.status) existing.status = item.status;
          if (item.offlineReason) existing.offlineReason = item.offlineReason;
        }
      }

      const results = Array.from(mergedMap.values());
      this.logger.log(
        `[HisfocusDriver] Berhasil menarik ${results.length} data ONU dari OLT '${this.olt.name}'`,
      );
      return results;
    } catch (err: any) {
      this.logger.error(
        `[HisfocusDriver] Gagal membaca data OLT '${this.olt.name}' (${host}): ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Mengambil data satu spesifik ONU
   */
  async getOnu(ref: { slot: number; port: number; onuIndex: number }): Promise<OnuInfo | null> {
    const list = await this.listOnus();
    return (
      list.find(
        (o) => o.slot === ref.slot && o.port === ref.port && o.onuIndex === ref.onuIndex,
      ) || null
    );
  }

  /**
   * Eksekusi sesi Telnet interaktif ke OLT Hisfocus / HSGQ:
   * Menangani negosiasi Telnet (IAC), otentikasi login, elevasi hak akses (enable),
   * pengiriman perintah diagnostik, dan penampungan output.
   */
  private executeTelnetCommands(
    host: string,
    port: number,
    user: string,
    pass: string,
    cmds: string[],
    timeoutMs = 7000,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let buffer = '';
      let authenticated = false;
      let cmdIndex = 0;
      let timer: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timer);
        socket.removeAllListeners();
        socket.destroy();
      };

      timer = setTimeout(() => {
        cleanup();
        if (buffer.length > 0) {
          this.logger.warn(`[HisfocusDriver] Telnet timeout di ${host}, mengembalikan ${buffer.length} bytes buffer`);
          resolve(buffer);
        } else {
          reject(new Error(`Koneksi Telnet ke ${host}:${port} timeout (${timeoutMs}ms)`));
        }
      }, timeoutMs);

      socket.connect(port, host, () => {
        this.logger.debug(`[HisfocusDriver] TCP Socket tersambung ke ${host}:${port}`);
      });

      socket.on('data', (chunk: Buffer) => {
        // Handle Telnet Option Negotiation (IAC 0xFF)
        const cleanChunk: number[] = [];
        let i = 0;
        while (i < chunk.length) {
          if (chunk[i] === 255) {
            const cmd = chunk[i + 1];
            const opt = chunk[i + 2];
            if (cmd === 253) {
              socket.write(Buffer.from([255, 252, opt || 0]));
            } else if (cmd === 251) {
              socket.write(Buffer.from([255, 254, opt || 0]));
            }
            i += 3;
          } else {
            cleanChunk.push(chunk[i]);
            i++;
          }
        }

        const text = Buffer.from(cleanChunk).toString('utf-8');
        buffer += text;

        // Mitigasi VULN-14: Batas maksimal buffer 3MB untuk proteksi Out of Memory DoS
        if (buffer.length > 3 * 1024 * 1024) {
          this.logger.warn(`[HisfocusDriver] Buffer Telnet melebihi 3MB di ${host}. Memutus socket untuk proteksi memory.`);
          cleanup();
          resolve(buffer);
          return;
        }

        const lower = text.toLowerCase();

        // 1. Cek Prompt Login Username
        if (!authenticated && (lower.includes('username:') || lower.includes('login:') || lower.includes('user:'))) {
          socket.write(`${user}\r\n`);
          return;
        }

        // 2. Cek Prompt Password
        if (!authenticated && (lower.includes('password:') || lower.includes('pass:'))) {
          socket.write(`${pass}\r\n`);
          authenticated = true;
          return;
        }

        // 3. Cek apakah di prompt user mode (>) dan perlu elevasi ke enable (#)
        if (authenticated && (text.includes('>') || text.includes('HSGQ>') || text.includes('Switch>'))) {
          socket.write('enable\r\n');
          return;
        }

        // 4. Setelah otentikasi & prompt siap (# atau $ atau OLT#), kirim perintah bertahap
        const isReadyPrompt = text.includes('#') || text.includes('$') || text.includes('OLT#') || text.includes('HSGQ#');
        if (authenticated && isReadyPrompt) {
          if (cmdIndex < cmds.length) {
            const nextCmd = cmds[cmdIndex++];
            this.logger.debug(`[HisfocusDriver] Mengirim: ${nextCmd}`);
            socket.write(`${nextCmd}\r\n`);
          } else {
            // Seluruh perintah telah terkirim
            setTimeout(() => {
              cleanup();
              resolve(buffer);
            }, 600);
          }
        }
      });

      socket.on('error', (err) => {
        cleanup();
        reject(err);
      });
    });
  }
}
