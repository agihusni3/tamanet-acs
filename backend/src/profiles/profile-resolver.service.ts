import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceProfile } from './device-profile.entity';
import { DEFAULT_PROFILES_SEED } from './default-profiles.seed';

export interface ResolveQuery {
  oui?: string;
  productClass?: string;
  firmwareVersion?: string;
  manufacturer?: string;
}

export interface ResolvedProfileResult {
  profile: DeviceProfile | null;
  status: 'matched' | 'fallback_generic' | 'profile_missing';
  params: Record<string, string>;
  capabilities: Record<string, boolean>;
}

@Injectable()
export class ProfileResolverService {
  private readonly logger = new Logger(ProfileResolverService.name);

  constructor(
    @InjectRepository(DeviceProfile)
    private readonly profileRepo: Repository<DeviceProfile>,
  ) {}

  /**
   * Cari profil yang cocok berdasarkan OUI dan ProductClass
   */
  async resolve(query: ResolveQuery): Promise<ResolvedProfileResult> {
    const oui = query.oui?.trim().toUpperCase() || '';
    const productClass = query.productClass?.trim() || '';
    const manufacturer = query.manufacturer?.trim().toLowerCase() || '';

    // 1. Coba pencocokan exact OUI + ProductClass
    if (oui && productClass) {
      const exactMatch = await this.profileRepo.findOne({
        where: { oui, productClass },
      });
      if (exactMatch) {
        return {
          profile: exactMatch,
          status: 'matched',
          params: exactMatch.params as Record<string, string>,
          capabilities: exactMatch.capabilities as Record<string, boolean>,
        };
      }
    }

    // 2. Coba pencocokan berdasarkan ProductClass saja jika OUI berbeda (misal Huawei OEM / Rebrand)
    if (productClass) {
      const classMatch = await this.profileRepo
        .createQueryBuilder('p')
        .where('LOWER(p.product_class) = LOWER(:pc)', { pc: productClass })
        .getOne();

      if (classMatch) {
        return {
          profile: classMatch,
          status: 'matched',
          params: classMatch.params as Record<string, string>,
          capabilities: classMatch.capabilities as Record<string, boolean>,
        };
      }
    }

    // 3. Coba deteksi Huawei atau Zimlink jika manufacturer mengandung kata kunci
    if (manufacturer.includes('huawei')) {
      const huaweiDefault = await this.profileRepo.findOne({
        where: { productClass: 'HG8245H5' },
      });
      if (huaweiDefault) {
        return {
          profile: huaweiDefault,
          status: 'matched',
          params: huaweiDefault.params as Record<string, string>,
          capabilities: huaweiDefault.capabilities as Record<string, boolean>,
        };
      }
    }

    if (manufacturer.includes('zimlink')) {
      const zimlinkDefault = await this.profileRepo.findOne({
        where: { productClass: 'ZM-G100' },
      });
      if (zimlinkDefault) {
        return {
          profile: zimlinkDefault,
          status: 'matched',
          params: zimlinkDefault.params as Record<string, string>,
          capabilities: zimlinkDefault.capabilities as Record<string, boolean>,
        };
      }
    }

    // 4. Fallback ke Generic TR-098
    const genericFallback = await this.profileRepo.findOne({
      where: { productClass: 'GENERIC', rootModel: 'TR098' },
    });

    if (genericFallback) {
      return {
        profile: genericFallback,
        status: 'fallback_generic',
        params: genericFallback.params as Record<string, string>,
        capabilities: genericFallback.capabilities as Record<string, boolean>,
      };
    }

    // 5. Jika database belum di-seed sekalipun, jangan throw error, tandai profile_missing
    this.logger.warn(`Device profile missing for OUI=${oui}, ProductClass=${productClass}`);
    return {
      profile: null,
      status: 'profile_missing',
      params: {},
      capabilities: {
        reboot: false,
        factoryReset: false,
        wifi: false,
        wifi5g: false,
        pppoe: false,
        firmware: false,
        ping: false,
        traceroute: false,
        hosts: false,
        rxPower: false,
      },
    };
  }

  /**
   * Seed profil default ke database jika masih kosong
   */
  async seedDefaultProfiles(): Promise<number> {
    let count = 0;
    for (const item of DEFAULT_PROFILES_SEED) {
      const exists = await this.profileRepo.findOne({
        where: { name: item.name },
      });
      if (!exists) {
        const entity = this.profileRepo.create(item);
        await this.profileRepo.save(entity);
        count++;
      }
    }
    if (count > 0) {
      this.logger.log(`Berhasil menyemai ${count} default device profiles.`);
    }
    return count;
  }
}
