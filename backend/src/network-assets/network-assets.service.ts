import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NetworkAsset, AssetType } from './network-asset.entity';
import { Cable } from './cable.entity';
import { CoverageArea } from './coverage-area.entity';
import { Device } from '../devices/device.entity';

@Injectable()
export class NetworkAssetsService {
  constructor(
    @InjectRepository(NetworkAsset)
    private readonly assetRepo: Repository<NetworkAsset>,
    @InjectRepository(Cable)
    private readonly cableRepo: Repository<Cable>,
    @InjectRepository(CoverageArea)
    private readonly areaRepo: Repository<CoverageArea>,
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
  ) {}

  // ===========================================================================
  // ASSETS CRUD (ODC, ODP, TIANG, JOINT_CLOSURE)
  // ===========================================================================
  async findAllAssets(type?: AssetType) {
    if (type) {
      return this.assetRepo.find({ where: { type }, relations: ['parent'] });
    }
    return this.assetRepo.find({ relations: ['parent'] });
  }

  async findOneAsset(id: string) {
    const asset = await this.assetRepo.findOne({ where: { id }, relations: ['parent'] });
    if (!asset) {
      throw new NotFoundException(`Aset '${id}' tidak ditemukan`);
    }
    return asset;
  }

  async createAsset(data: {
    type: AssetType;
    name: string;
    capacity?: number;
    used?: number;
    parentId?: string;
    lat?: number;
    lng?: number;
  }) {
    const asset = this.assetRepo.create({
      type: data.type,
      name: data.name,
      capacity: data.capacity || 8,
      used: data.used || 0,
      parentId: data.parentId || null,
      geom: data.lat && data.lng ? `SRID=4326;POINT(${data.lng} ${data.lat})` : null,
    });
    return this.assetRepo.save(asset);
  }

  async updateAsset(id: string, data: Partial<NetworkAsset> & { lat?: number; lng?: number }) {
    const asset = await this.findOneAsset(id);
    if (data.lat !== undefined && data.lng !== undefined) {
      asset.geom = `SRID=4326;POINT(${data.lng} ${data.lat})`;
    }
    Object.assign(asset, data);
    return this.assetRepo.save(asset);
  }

  async removeAsset(id: string) {
    const asset = await this.findOneAsset(id);
    await this.assetRepo.remove(asset);
    return { success: true };
  }

  // ===========================================================================
  // CABLES CRUD
  // ===========================================================================
  async findAllCables() {
    return this.cableRepo.find({ relations: ['fromAsset', 'toAsset'] });
  }

  async createCable(data: {
    name: string;
    type?: string;
    coreCount?: number;
    fromAssetId?: string;
    toAssetId?: string;
    coordinates?: [number, number][]; // [[lng, lat], [lng, lat], ...]
  }) {
    let geomStr = null;
    if (data.coordinates && data.coordinates.length >= 2) {
      const linePoints = data.coordinates.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
      geomStr = `SRID=4326;LINESTRING(${linePoints})`;
    }

    const cable = this.cableRepo.create({
      name: data.name,
      type: data.type || 'Drop Core',
      coreCount: data.coreCount || 1,
      fromAssetId: data.fromAssetId || null,
      toAssetId: data.toAssetId || null,
      geom: geomStr,
    });
    return this.cableRepo.save(cable);
  }

  // ===========================================================================
  // GEOJSON EXPORT UNTUK MAPLIBRE GL (BBOX & CLUSTERING)
  // ===========================================================================
  async getGeoAssets(types?: string, bbox?: string) {
    const query = this.assetRepo.createQueryBuilder('asset');

    if (types) {
      const typeList = types.split(',') as AssetType[];
      query.andWhere('asset.type IN (:...typeList)', { typeList });
    }

    // Ekstrak ST_AsGeoJSON jika PostGIS aktif, atau ambil raw
    const assets = await query.getMany();

    const features = assets.map((a) => {
      let coordinates: [number, number] = [104.7876, -5.3214]; // Fallback Tanggamus
      if (a.geom && typeof a.geom === 'string' && a.geom.includes('POINT')) {
        const match = a.geom.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          coordinates = [parseFloat(match[1]), parseFloat(match[2])];
        }
      }

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates,
        },
        properties: {
          id: a.id,
          name: a.name,
          type: a.type,
          capacity: a.capacity,
          used: a.used,
          available: a.capacity - a.used,
        },
      };
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  async getGeoDevices(bbox?: string) {
    const devices = await this.deviceRepo.find({
      relations: ['customer', 'profile'],
    });

    const features = devices
      .filter((d) => d.customer && d.customer.geom)
      .map((d) => {
        let coordinates: [number, number] = [104.7876, -5.3214];
        if (d.customer?.geom) {
          const match = d.customer.geom.match(/POINT\(([^ ]+) ([^)]+)\)/);
          if (match) {
            coordinates = [parseFloat(match[1]), parseFloat(match[2])];
          }
        }

        // Tentukan warna sinyal
        let rxNum = parseFloat(d.rxPowerAcs || '-20');
        let signalStatus = 'good';
        if (d.status === 'OFFLINE') {
          signalStatus = 'offline';
        } else if (rxNum < -26) {
          signalStatus = 'critical';
        } else if (rxNum < -23) {
          signalStatus = 'warning';
        }

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates,
          },
          properties: {
            id: d.id,
            genieId: d.genieId,
            serial: d.serial,
            customerName: d.customer?.name || 'Pelanggan',
            customerNo: d.customer?.customerNo || '-',
            manufacturer: d.manufacturer,
            model: d.model,
            status: d.status,
            signalStatus,
            rxPower: d.rxPowerAcs || 'N/A',
            wanIp: d.wanIp || 'N/A',
            uptime: d.uptime,
          },
        };
      });

    return {
      type: 'FeatureCollection',
      features,
    };
  }
}
