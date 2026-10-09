import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { ProfilesService } from './profiles.service';
import { DeviceProfile } from './device-profile.entity';
import { ResolveQuery, ResolvedProfileResult } from './profile-resolver.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  @Roles(UserRole.ADMIN)
  async seed(): Promise<{ count: number; message: string }> {
    return this.profilesService.seed();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<DeviceProfile> {
    return this.profilesService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() data: Partial<DeviceProfile>): Promise<DeviceProfile> {
    return this.profilesService.create(data);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() data: Partial<DeviceProfile>,
  ): Promise<DeviceProfile> {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string): Promise<{ success: boolean }> {
    await this.profilesService.remove(id);
    return { success: true };
  }
}
