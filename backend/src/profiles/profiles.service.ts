import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceProfile } from './device-profile.entity';
import { ProfileResolverService, ResolveQuery, ResolvedProfileResult } from './profile-resolver.service';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(DeviceProfile)
    private readonly repo: Repository<DeviceProfile>,
    private readonly resolver: ProfileResolverService,
  ) {}

  async findAll(): Promise<DeviceProfile[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<DeviceProfile> {
    const profile = await this.repo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException(`Profile dengan ID '${id}' tidak ditemukan`);
    }
    return profile;
  }

  async create(data: Partial<DeviceProfile>): Promise<DeviceProfile> {
    const profile = this.repo.create(data);
    return this.repo.save(profile);
  }

  async update(id: string, data: Partial<DeviceProfile>): Promise<DeviceProfile> {
    const profile = await this.findOne(id);
    Object.assign(profile, data);
    return this.repo.save(profile);
  }

  async remove(id: string): Promise<void> {
    const profile = await this.findOne(id);
    await this.repo.remove(profile);
  }

  async resolve(query: ResolveQuery): Promise<ResolvedProfileResult> {
    return this.resolver.resolve(query);
  }

  async seed(): Promise<{ count: number; message: string }> {
    const count = await this.resolver.seedDefaultProfiles();
    return {
      count,
      message: `${count} default profile berhasil dimasukkan`,
    };
  }
}
