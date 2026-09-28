import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Olt } from '../olt/olt.entity';
import { PonPort } from '../olt/pon-port.entity';
import { Onu } from '../olt/onu.entity';
import { Device } from '../devices/device.entity';
import { Alert } from '../alerts/alert.entity';
import { OltCollectorService } from './olt-collector.service';
import { OltCollectorController } from './olt-collector.controller';
import { CliParserService } from './cli-parser.service';

@Module({
  imports: [TypeOrmModule.forFeature([Olt, PonPort, Onu, Device, Alert])],
  controllers: [OltCollectorController],
  providers: [OltCollectorService, CliParserService],
  exports: [OltCollectorService, CliParserService],
})
export class OltCollectorModule {}
