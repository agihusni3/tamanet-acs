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
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { DevicesService } from './devices.service';
import { SetWifiPayload, SetPppoePayload } from '../tasks/task-payload-builder.service';
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
  // REMOTE ACTIONS
  // ===========================================================================

  @Post(':id/reboot')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async reboot(@Param('id') id: string, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.reboot(id, req.user?.id, ip);
  }

  @Post(':id/factory-reset')
  @Roles(UserRole.ADMIN) // Hanya ADMIN
  async factoryReset(@Param('id') id: string, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.factoryReset(id, req.user?.id, ip);
  }

  @Post(':id/wifi')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async setWifi(
    @Param('id') id: string,
    @Body() payload: SetWifiPayload,
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.setWifi(id, payload, req.user?.id, ip);
  }

  @Post(':id/pppoe')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async setPppoe(
    @Param('id') id: string,
    @Body() payload: SetPppoePayload,
    @Req() req: any,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
    return this.devicesService.setPppoe(id, payload, req.user?.id, ip);
  }

  @Post(':id/refresh')
  @Roles(UserRole.ADMIN, UserRole.NOC, UserRole.TEKNISI)
  async refresh(@Param('id') id: string, @Req() req: any) {
    return this.devicesService.refresh(id, req.user?.id);
  }
}
