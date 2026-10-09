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
import { Throttle } from '@nestjs/throttler';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { NetworkAssetsService } from './network-assets.service';
import { AssetType } from './network-asset.entity';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { CreateCableDto } from './dto/create-cable.dto';
import { UpdateCableDto } from './dto/update-cable.dto';

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class NetworkAssetsController {
  constructor(private readonly assetsService: NetworkAssetsService) {}

  @Get('assets')
  async findAllAssets(@Query('type') type?: AssetType) {
    return this.assetsService.findAllAssets(type);
  }

  @Get('assets/:id')
  async findOneAsset(@Param('id') id: string) {
    return this.assetsService.findOneAsset(id);
  }

  @Post('assets')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async createAsset(@Body() data: CreateAssetDto) {
    return this.assetsService.createAsset(data);
  }

  @Put('assets/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async updateAsset(@Param('id') id: string, @Body() data: UpdateAssetDto) {
    return this.assetsService.updateAsset(id, data);
  }

  @Delete('assets/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async removeAsset(@Param('id') id: string) {
    return this.assetsService.removeAsset(id);
  }

  @Get('cables')
  async findAllCables() {
    return this.assetsService.findAllCables();
  }

  @Get('cables/:id')
  async findOneCable(@Param('id') id: string) {
    return this.assetsService.findOneCable(id);
  }

  @Post('cables')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async createCable(@Body() data: CreateCableDto) {
    return this.assetsService.createCable(data);
  }

  @Put('cables/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async updateCable(@Param('id') id: string, @Body() data: UpdateCableDto) {
    return this.assetsService.updateCable(id, data);
  }

  @Delete('cables/:id')
  @Roles(UserRole.ADMIN, UserRole.NOC)
  async removeCable(@Param('id') id: string) {
    return this.assetsService.removeCable(id);
  }

  // ===========================================================================
  // GIS GEOJSON ENDPOINTS (Dilindungi Rate Limiting untuk mencegah DoS query PostGIS)
  // ===========================================================================
  @Get('geo/assets')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getGeoAssets(@Query('types') types?: string, @Query('bbox') bbox?: string) {
    return this.assetsService.getGeoAssets(types, bbox);
  }

  @Get('geo/devices')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getGeoDevices(@Query('bbox') bbox?: string) {
    return this.assetsService.getGeoDevices(bbox);
  }
}

