import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { DevicesService } from './devices.service';
import { SetWifiDto, SetPppoeDto } from './dto/remote-actions.dto';
import { DeviceStatus } from './device.entity';

@Controller('devices')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll(
    @Query('status') status?: DeviceStatus,
    @Query('search') search?: string,
    @Query('manufacturer') manufacturer?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.devicesService.findAll({ status, search, manufacturer, page, limit });
  }

  @Post('sync')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async sync() {
    return this.devicesService.syncFromGenieACS();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id/assign-customer')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async assignCustomer(
    @Param('id') id: string,
    @Body('customerId') customerId: string | null,
  ) {
    return this.devicesService.assignCustomer(id, customerId);
  }

  // ===========================================================================
  // REMOTE ACTIONS (Protected with Strict Rate Limiting - Mitigasi ATK-01)
  // ===========================================================================

  @Post(':id/reboot')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reboot(@Param('id') id: string, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.reboot(id, req.user?.id, ip);
  }

  @Post(':id/factory-reset')
  @Roles(UserRole.ADMIN) // Hanya ADMIN
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async factoryReset(@Param('id') id: string, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.factoryReset(id, req.user?.id, ip);
  }

  @Post(':id/wifi')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async setWifi(
    @Param('id') id: string,
    @Body() payload: SetWifiDto,
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.setWifi(id, payload, req.user?.id, ip);
  }

  @Post(':id/pppoe')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setPppoe(
    @Param('id') id: string,
    @Body() payload: SetPppoeDto,
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.setPppoe(id, payload, req.user?.id, ip);
  }

  @Post(':id/refresh')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async refresh(@Param('id') id: string, @Req() req: any) {
    return this.devicesService.refresh(id, req.user?.id);
  }
}
