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
    let geom: string | null = null;
    if (data.lat != null && data.lng != null) {
      const latNum = Number(data.lat);
      const lngNum = Number(data.lng);
      if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
        geom = `SRID=4326;POINT(${lngNum.toFixed(7)} ${latNum.toFixed(7)})`;
      }
    }

    const asset = this.assetRepo.create({
      type: data.type,
      name: data.name,
      capacity: data.capacity || 8,
      used: data.used || 0,
      parentId: data.parentId || null,
      geom,
    });
    return this.assetRepo.save(asset);
  }

  async updateAsset(
    id: string,
    data: {
      type?: AssetType;
      name?: string;
      capacity?: number;
      used?: number;
      parentId?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    const asset = await this.findOneAsset(id);
    if (data.type !== undefined) asset.type = data.type;
    if (data.name !== undefined) asset.name = data.name;
    if (data.capacity !== undefined) asset.capacity = data.capacity;
    if (data.used !== undefined) asset.used = data.used;
    if (data.parentId !== undefined) asset.parentId = data.parentId || null;

    if (data.lat !== undefined || data.lng !== undefined) {
      if (data.lat != null && data.lng != null) {
        const latNum = Number(data.lat);
        const lngNum = Number(data.lng);
        if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
          asset.geom = `SRID=4326;POINT(${lngNum.toFixed(7)} ${latNum.toFixed(7)})`;
        }
      } else {
        asset.geom = null;
      }
    }

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
    notes?: string;
  }) {
    let geomStr: string | null = null;
    if (data.coordinates && Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
      const validPoints = data.coordinates.filter(
        (pt) =>
          Array.isArray(pt) &&
          pt.length >= 2 &&
          !isNaN(Number(pt[0])) &&
          !isNaN(Number(pt[1])) &&
          Number(pt[1]) >= -90 &&
          Number(pt[1]) <= 90 &&
          Number(pt[0]) >= -180 &&
          Number(pt[0]) <= 180,
      );
      if (validPoints.length >= 2) {
        const linePoints = validPoints
          .map(([lng, lat]) => `${Number(lng).toFixed(7)} ${Number(lat).toFixed(7)}`)
          .join(', ');
        geomStr = `SRID=4326;LINESTRING(${linePoints})`;
      }
    }

    const cable = this.cableRepo.create({
      name: data.name,
      type: data.type || 'Drop Core',
      coreCount: data.coreCount || 1,
      fromAssetId: data.fromAssetId || null,
      toAssetId: data.toAssetId || null,
      geom: geomStr,
      notes: data.notes || null,
    });
    return this.cableRepo.save(cable);
  }

  async findOneCable(id: string) {
    const cable = await this.cableRepo.findOne({
      where: { id },
      relations: ['fromAsset', 'toAsset'],
    });
    if (!cable) {
      throw new NotFoundException(`Kabel '${id}' tidak ditemukan`);
    }
    return cable;
  }

  async updateCable(
    id: string,
    data: {
      name?: string;
      type?: string;
      coreCount?: number;
      fromAssetId?: string;
      toAssetId?: string;
      coordinates?: [number, number][];
      notes?: string;
    },
  ) {
    const cable = await this.findOneCable(id);
    if (data.name !== undefined) cable.name = data.name;
    if (data.type !== undefined) cable.type = data.type;
    if (data.coreCount !== undefined) cable.coreCount = data.coreCount;
    if (data.fromAssetId !== undefined) cable.fromAssetId = data.fromAssetId || null;
    if (data.toAssetId !== undefined) cable.toAssetId = data.toAssetId || null;
    if (data.notes !== undefined) cable.notes = data.notes || null;

    if (data.coordinates && Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
      const validPoints = data.coordinates.filter(
        (pt) =>
          Array.isArray(pt) &&
          pt.length >= 2 &&
          !isNaN(Number(pt[0])) &&
          !isNaN(Number(pt[1])) &&
          Number(pt[1]) >= -90 &&
          Number(pt[1]) <= 90 &&
          Number(pt[0]) >= -180 &&
          Number(pt[0]) <= 180,
      );
      if (validPoints.length >= 2) {
        const linePoints = validPoints
          .map(([lng, lat]) => `${Number(lng).toFixed(7)} ${Number(lat).toFixed(7)}`)
          .join(', ');
        cable.geom = `SRID=4326;LINESTRING(${linePoints})`;
      }
    }

    return this.cableRepo.save(cable);
  }

  async removeCable(id: string) {
    const cable = await this.findOneCable(id);
    await this.cableRepo.remove(cable);
    return { success: true };
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
      if (a.geom && typeof a.geom === 'string') {
        const start = a.geom.indexOf('POINT(');
        const end = a.geom.indexOf(')', start);
        if (start !== -1 && end !== -1) {
          const parts = a.geom.substring(start + 6, end).trim().split(/\s+/);
          if (parts.length >= 2) {
            const lng = parseFloat(parts[0]);
            const lat = parseFloat(parts[1]);
            if (!isNaN(lng) && !isNaN(lat)) {
              coordinates = [lng, lat];
            }
          }
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
        if (d.customer?.geom && typeof d.customer.geom === 'string') {
          const start = d.customer.geom.indexOf('POINT(');
          const end = d.customer.geom.indexOf(')', start);
          if (start !== -1 && end !== -1) {
            const parts = d.customer.geom.substring(start + 6, end).trim().split(/\s+/);
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lng) && !isNaN(lat)) {
                coordinates = [lng, lat];
              }
            }
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
