import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DeviceProfile } from '../profiles/device-profile.entity';

export interface SetWifiPayload {
  band: '2.4' | '5';
  ssid?: string;
  password?: string;
  enable?: boolean;
}

export interface SetPppoePayload {
  username?: string;
  password?: string;
}

@Injectable()
export class TaskPayloadBuilderService {
  /**
   * Membentuk parameter values untuk ganti Wi-Fi berdasarkan Device Profile
   */
  buildWifiParams(
    profile: DeviceProfile | null,
    payload: SetWifiPayload,
  ): [string, any, string?][] {
    if (!profile) {
      throw new UnprocessableEntityException(
        'Perangkat belum memiliki profil konfigurasi (profile_missing). Aksi WiFi tidak dapat dijalankan.',
      );
    }

    if (!profile.capabilities?.wifi) {
      throw new UnprocessableEntityException(
        `Perangkat model '${profile.name}' tidak mendukung fitur Wi-Fi (misal Bridge ONU).`,
      );
    }

    if (payload.band === '5' && !profile.capabilities?.wifi5g) {
      throw new UnprocessableEntityException(
        `Perangkat model '${profile.name}' adalah Single-Band (2.4 GHz saja), tidak mendukung Wi-Fi 5 GHz.`,
      );
    }

    const result: [string, any, string?][] = [];
    const is5G = payload.band === '5';

    // 1. Set SSID
    if (payload.ssid) {
      const ssidPath = is5G ? profile.params.ssid5 : profile.params.ssid24;
      if (!ssidPath) {
        throw new UnprocessableEntityException(
          `Path parameter untuk SSID ${payload.band} GHz belum didefinisikan pada profil '${profile.name}'.`,
        );
      }
      result.push([ssidPath, payload.ssid, 'xsd:string']);
    }

    // 2. Set Password
    if (payload.password) {
      if (payload.password.length < 8) {
        throw new UnprocessableEntityException('Password Wi-Fi minimal 8 karakter.');
      }
      const passPath = is5G ? profile.params.wifiPass5 : profile.params.wifiPass24;
      if (!passPath) {
        throw new UnprocessableEntityException(
          `Path parameter untuk Password Wi-Fi ${payload.band} GHz belum didefinisikan pada profil '${profile.name}'.`,
        );
      }
      result.push([passPath, payload.password, 'xsd:string']);
    }

    // 3. Set Enable
    if (payload.enable !== undefined) {
      const enablePath = is5G ? profile.params.wifiEnable5 : profile.params.wifiEnable24;
      if (enablePath) {
        result.push([enablePath, payload.enable, 'xsd:boolean']);
      }
    }

    if (result.length === 0) {
      throw new UnprocessableEntityException('Minimal harus mengisi SSID atau Password Wi-Fi.');
    }

    return result;
  }

  /**
   * Membentuk parameter values untuk ganti Username/Password PPPoE
   */
  buildPppoeParams(
    profile: DeviceProfile | null,
    payload: SetPppoePayload,
  ): [string, any, string?][] {
    if (!profile) {
      throw new UnprocessableEntityException(
        'Perangkat belum memiliki profil konfigurasi (profile_missing). Aksi PPPoE tidak dapat dijalankan.',
      );
    }

    if (!profile.capabilities?.pppoe) {
      throw new UnprocessableEntityException(
        `Perangkat model '${profile.name}' tidak mendukung konfigurasi PPPoE via ACS.`,
      );
    }

    const result: [string, any, string?][] = [];

    if (payload.username) {
      const userPath = profile.params.pppoeUser;
      if (!userPath) {
        throw new UnprocessableEntityException(
          `Path parameter untuk PPPoE Username belum ada di profil '${profile.name}'.`,
        );
      }
      result.push([userPath, payload.username, 'xsd:string']);
    }

    if (payload.password) {
      const passPath = profile.params.pppoePass;
      if (!passPath) {
        throw new UnprocessableEntityException(
          `Path parameter untuk PPPoE Password belum ada di profil '${profile.name}'.`,
        );
      }
      result.push([passPath, payload.password, 'xsd:string']);
    }

    if (result.length === 0) {
      throw new UnprocessableEntityException('Minimal harus mengisi username atau password PPPoE.');
    }

    return result;
  }
}
