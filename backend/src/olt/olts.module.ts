import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Olt } from './olt.entity';
import { PonPort } from './pon-port.entity';
import { Onu } from './onu.entity';
import { OltsService } from './olts.service';
import { OltsController } from './olts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Olt, PonPort, Onu])],
  controllers: [OltsController],
  providers: [OltsService],
  exports: [OltsService],
})
export class OltsModule {}
