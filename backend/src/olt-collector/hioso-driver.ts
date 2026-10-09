import * as net from 'net';
import * as snmp from 'net-snmp';
import { Logger } from '@nestjs/common';
import { OltDriver, OnuInfo, PonPortInfo } from './olt-driver.interface';
import { CliParserService } from './cli-parser.service';
import { Olt } from '../olt/olt.entity';
import { decryptCredential } from '../common/crypto.util';

export class HiosoDriver implements OltDriver {
  private readonly logger = new Logger(HiosoDriver.name);
  private readonly parser = new CliParserService();

  constructor(private readonly olt: Olt) {}

  /**
   * Menentukan jumlah dan nama Port PON berdasarkan tipe model OLT Hioso:
   * - HA7302CST / 2P1G: 2 Port (EPON0/1, EPON0/2)
   * - HA7304: 4 Port (EPON0/1 s/d EPON0/4)
   */
  async listPonPorts(): Promise<PonPortInfo[]> {
    const portCount = this.getPonPortsCount();
    const ports: PonPortInfo[] = [];

    for (let p = 1; p <= portCount; p++) {
      ports.push({
        slot: 0,
        port: p,
        label: `EPON0/${p}`,
      });
    }

    return ports;
  }

  /**
   * Deteksi jumlah port PON dari konfigurasi OLT atau nama model
   */
  private getPonPortsCount(): number {
    if (this.olt.ponPortsCount && this.olt.ponPortsCount > 0) {
      return this.olt.ponPortsCount;
    }
    const model = (this.olt.model || '').toUpperCase();
    if (model.includes('7304') || model.includes('4P') || model.includes('4-PORT')) {
      return 4;
    }
    // Default untuk HA7302CST, 2P1G, atau 2-Port Standalone
    return 2;
  }

  /**
   * Mengambil daftar seluruh ONU beserta status (online, LOS, Dying-Gasp),
   * MAC Address, dan sinyal optik dBm dari OLT Hioso secara langsung via Telnet CLI.
   */
  async listOnus(): Promise<OnuInfo[]> {
    const host = this.olt.ip;
    const port = this.olt.cliPort || 23;
    const username = this.olt.cliUser || this.olt.defaultUser || 'admin';
    const rawPass = this.olt.cliPass || this.olt.defaultPass || 'admin';
    const password = decryptCredential(rawPass);

    this.logger.log(
      `[HiosoDriver] Menghubungkan ke OLT '${this.olt.name}' (${this.olt.model}) di ${host}:${port}...`,
    );

    // Perintah standar CLI Hioso untuk menarik data ONU dan Optik
    const commands = [
      'terminal length 0',
      'show onu info',
      'show onu opm-diag',
      'show epon onu-information',
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
        `[HiosoDriver] Berhasil menarik ${results.length} data ONU dari OLT '${this.olt.name}'`,
      );
      return results;
    } catch (err: any) {
      this.logger.error(
        `[HiosoDriver] Gagal membaca data OLT '${this.olt.name}' (${host}): ${err.message}`,
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
   * Eksekusi sesi Telnet interaktif ke OLT Hioso:
   * Menangani Telnet Negotiation (IAC), autentikasi username/password,
   * pengiriman perintah diagnostik, dan penampungan buffer output.
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
          // Jika ada output yang sempat terbaca sebelum timeout, kembalikan data tersebut
          this.logger.warn(`[HiosoDriver] Telnet timeout di ${host}, mengembalikan ${buffer.length} bytes buffer`);
          resolve(buffer);
        } else {
          reject(new Error(`Koneksi Telnet ke ${host}:${port} timeout (${timeoutMs}ms)`));
        }
      }, timeoutMs);

      socket.connect(port, host, () => {
        this.logger.debug(`[HiosoDriver] TCP Socket tersambung ke ${host}:${port}`);
      });

      socket.on('data', (chunk: Buffer) => {
        // Handle Telnet Option Negotiation (IAC 0xFF)
        const cleanChunk: number[] = [];
        let i = 0;
        while (i < chunk.length) {
          if (chunk[i] === 255) {
            // Telnet IAC
            const cmd = chunk[i + 1];
            const opt = chunk[i + 2];
            // Jika DO (253) -> balas WONT (252)
            // Jika WILL (251) -> balas DONT (254)
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
          this.logger.warn(`[HiosoDriver] Buffer Telnet melebihi 3MB di ${host}. Memutus socket untuk proteksi memory.`);
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

        // 3. Cek Prompt CLI Siap Eksekusi ('>' atau '#')
        if (authenticated && (text.includes('>') || text.includes('#'))) {
          if (cmdIndex < cmds.length) {
            const nextCmd = cmds[cmdIndex++];
            this.logger.debug(`[HiosoDriver] Mengirim perintah CLI: ${nextCmd}`);
            socket.write(`${nextCmd}\r\n`);
          } else {
            // Semua perintah selesai
            socket.write('exit\r\n');
            setTimeout(() => {
              cleanup();
              resolve(buffer);
            }, 300);
          }
        }
      });

      socket.on('error', (err) => {
        cleanup();
        reject(new Error(`Socket Telnet error: ${err.message}`));
      });

      socket.on('close', () => {
        clearTimeout(timer);
        resolve(buffer);
      });
    });
  }

  /**
   * Uji coba koneksi SNMP v2c ke OLT Hioso (Port UDP 161)
   * Membaca sysDescr dan sysUpTime OLT
   */
  async testSnmp(): Promise<{ online: boolean; sysDescr?: string; uptimeSeconds?: number }> {
    return new Promise((resolve) => {
      const session = snmp.createSession(this.olt.ip, this.olt.snmpCommunity || 'public', {
        version: snmp.Version2c,
        timeout: 3000,
        retries: 1,
      });

      const oids = ['1.3.6.1.2.1.1.1.0', '1.3.6.1.2.1.1.3.0'];

      session.get(oids, (error: any, varbinds: any[]) => {
        session.close();
        if (error) {
          this.logger.warn(`[HiosoDriver] SNMP walk gagal pada ${this.olt.ip}: ${error.message}`);
          resolve({ online: false });
        } else {
          let descr = '';
          let uptime = 0;
          if (varbinds && varbinds.length > 0) {
            descr = varbinds[0].value ? varbinds[0].value.toString() : '';
            uptime = varbinds[1]?.value ? Math.round(Number(varbinds[1].value) / 100) : 0;
          }
          resolve({ online: true, sysDescr: descr, uptimeSeconds: uptime });
        }
      });
    });
  }
}
