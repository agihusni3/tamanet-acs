import { Controller, Post, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { OltCollectorService } from './olt-collector.service';

@Controller('olt-collector')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OltCollectorController {
  constructor(private readonly collectorService: OltCollectorService) {}

  @Post('poll-now')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async pollNow() {
    return this.collectorService.collectAll();
  }
}
