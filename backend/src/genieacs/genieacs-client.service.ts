import { Injectable, Logger, HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface ParameterValueTuple {
  [paramPath: string]: any;
}

@Injectable()
export class GenieacsClientService {
  private readonly logger = new Logger(GenieacsClientService.name);
  private readonly client: AxiosInstance;

  constructor() {
    const nbiUrl = process.env.GENIEACS_NBI_URL || 'http://127.0.0.1:7557';
    this.client = axios.create({
      baseURL: nbiUrl,
      timeout: 15000,
    });
  }

  /**
   * Mitigasi ATK-06: Validasi Device ID untuk mencegah URI injection / parameter pollution
   */
  private validateDeviceId(deviceId: string): string {
    if (!deviceId || typeof deviceId !== 'string') {
      throw new BadRequestException('ID Perangkat tidak valid');
    }
    const trimmed = deviceId.trim();
    if (!/^[a-zA-Z0-9_\-\.\:\%]+$/.test(trimmed)) {
      throw new BadRequestException('Format ID Perangkat tidak sah (mengandung karakter terlarang)');
    }
    return trimmed;
  }

  /**
   * Mengambil daftar perangkat dari GenieACS NBI
   */
  async getDevices(queryObj: Record<string, any> = {}): Promise<any[]> {
    try {
      const queryStr = Object.keys(queryObj).length ? encodeURIComponent(JSON.stringify(queryObj)) : '';
      const url = queryStr ? `/devices/?query=${queryStr}` : '/devices/';
      const res = await this.client.get(url);
      return res.data;
    } catch (err: any) {
      this.logger.error(`Error getDevices dari NBI: ${err.message}`);
      return [];
    }
  }

  /**
   * Mengambil detail satu perangkat dari NBI berdasarkan ID
   */
  async getDevice(deviceId: string): Promise<any | null> {
    const safeId = this.validateDeviceId(deviceId);
    try {
      const res = await this.client.get(`/devices/?query=${encodeURIComponent(JSON.stringify({ _id: safeId }))}`);
      if (res.data && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    } catch (err: any) {
      this.logger.error(`Error getDevice '${safeId}' dari NBI: ${err.message}`);
      return null;
    }
  }

  /**
   * Mengirim task reboot ke modem
   */
  async reboot(deviceId: string, connectionRequest = true): Promise<any> {
    return this.createTask(deviceId, { name: 'reboot' }, connectionRequest);
  }

  /**
   * Mengirim task factoryReset ke modem
   */
  async factoryReset(deviceId: string, connectionRequest = true): Promise<any> {
    return this.createTask(deviceId, { name: 'factoryReset' }, connectionRequest);
  }

  /**
   * Mengirim task setParameterValues ke modem
   */
  async setParameterValues(
    deviceId: string,
    parameterValues: [string, any, string?][],
    connectionRequest = true,
  ): Promise<any> {
    return this.createTask(
      deviceId,
      {
        name: 'setParameterValues',
        parameterValues,
      },
      connectionRequest,
    );
  }

  /**
   * Refresh object atau parameter tertentu
   */
  async refreshObject(deviceId: string, objectName: string, connectionRequest = true): Promise<any> {
    return this.createTask(
      deviceId,
      {
        name: 'refreshObject',
        objectName,
      },
      connectionRequest,
    );
  }

  /**
   * Task generic ke GenieACS NBI
   * Jika connection_request gagal (modem di belakang NAT), fallback tanpa connection_request
   */
  async createTask(deviceId: string, taskPayload: any, connectionRequest = true): Promise<any> {
    const safeId = this.validateDeviceId(deviceId);
    const encodedId = encodeURIComponent(safeId);
    const crParam = connectionRequest ? '?connection_request' : '';

    try {
      const res = await this.client.post(`/devices/${encodedId}/tasks${crParam}`, taskPayload);
      return { success: true, queued: false, data: res.data };
    } catch (err: any) {
      // Jika connection request timeout atau gagal karena NAT, antrekan tanpa connection_request
      if (connectionRequest) {
        this.logger.warn(`Connection Request gagal untuk ${deviceId} (mungkin di balik NAT). Mengantrekan task untuk Inform berikutnya...`);
        try {
          const fallbackRes = await this.client.post(`/devices/${encodedId}/tasks`, taskPayload);
          return {
            success: true,
            queued: true,
            message: 'Perangkat di balik NAT. Task masuk antrean dan dieksekusi saat Inform berikutnya.',
            data: fallbackRes.data,
          };
        } catch (innerErr: any) {
          throw new HttpException(
            `Gagal membuat task antrean: ${innerErr.response?.data || innerErr.message}`,
            HttpStatus.BAD_GATEWAY,
          );
        }
      }

      throw new HttpException(
        `Gagal membuat task NBI: ${err.response?.data || err.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
