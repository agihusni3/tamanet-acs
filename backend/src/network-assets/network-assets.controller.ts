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
import { NetworkAssetsService } from './network-assets.service';
import { AssetType } from './network-asset.entity';

@Controller()
@UseGuards(AuthGuard('jwt'))
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
  async createAsset(@Body() data: any) {
    return this.assetsService.createAsset(data);
  }

  @Put('assets/:id')
  async updateAsset(@Param('id') id: string, @Body() data: any) {
    return this.assetsService.updateAsset(id, data);
  }

  @Delete('assets/:id')
  async removeAsset(@Param('id') id: string) {
    return this.assetsService.removeAsset(id);
  }

  @Get('cables')
  async findAllCables() {
    return this.assetsService.findAllCables();
  }

  @Post('cables')
  async createCable(@Body() data: any) {
    return this.assetsService.createCable(data);
  }

  // ===========================================================================
  // GIS GEOJSON ENDPOINTS (Untuk MapLibre GL)
  // ===========================================================================
  @Get('geo/assets')
  async getGeoAssets(@Query('types') types?: string, @Query('bbox') bbox?: string) {
    return this.assetsService.getGeoAssets(types, bbox);
  }

  @Get('geo/devices')
  async getGeoDevices(@Query('bbox') bbox?: string) {
    return this.assetsService.getGeoDevices(bbox);
  }
}
