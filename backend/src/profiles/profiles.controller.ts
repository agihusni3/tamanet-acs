import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { DeviceProfile } from './device-profile.entity';
import { ResolveQuery, ResolvedProfileResult } from './profile-resolver.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async findAll(): Promise<DeviceProfile[]> {
    return this.profilesService.findAll();
  }

  @Get('resolve')
  async resolve(@Query() query: ResolveQuery): Promise<ResolvedProfileResult> {
    return this.profilesService.resolve(query);
  }

  @Post('seed')
  async seed(): Promise<{ count: number; message: string }> {
    return this.profilesService.seed();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DeviceProfile> {
    return this.profilesService.findOne(id);
  }

  @Post()
  async create(@Body() data: Partial<DeviceProfile>): Promise<DeviceProfile> {
    return this.profilesService.create(data);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: Partial<DeviceProfile>,
  ): Promise<DeviceProfile> {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.profilesService.remove(id);
    return { success: true };
  }
}
