import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NetworkAsset } from './network-asset.entity';
import { Cable } from './cable.entity';
import { CoverageArea } from './coverage-area.entity';
import { Device } from '../devices/device.entity';
import { NetworkAssetsService } from './network-assets.service';
import { NetworkAssetsController } from './network-assets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NetworkAsset, Cable, CoverageArea, Device])],
  controllers: [NetworkAssetsController],
  providers: [NetworkAssetsService],
  exports: [NetworkAssetsService],
})
export class NetworkAssetsModule {}
