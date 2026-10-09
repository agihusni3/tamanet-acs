import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { OltCollectorService } from './olt-collector.service';

@Controller('olt-collector')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OltCollectorController {
  constructor(private readonly collectorService: OltCollectorService) {}

  // Maksimal 5x polling massal per menit untuk mencegah CPU spike pada OLT fisik
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('poll-now')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async pollNow() {
    return this.collectorService.collectAll();
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('poll/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async pollOlt(@Param('id') id: string) {
    return this.collectorService.collectFromOltById(id);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('test-connection/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async testConnection(@Param('id') id: string) {
    return this.collectorService.testOltConnection(id);
  }
}

