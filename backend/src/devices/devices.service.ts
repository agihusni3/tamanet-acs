import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Device, DeviceStatus } from './device.entity';
import { GenieacsClientService } from '../genieacs/genieacs-client.service';
import { ProfileResolverService } from '../profiles/profile-resolver.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskType } from '../tasks/task.entity';
import { TaskPayloadBuilderService, SetWifiPayload, SetPppoePayload } from '../tasks/task-payload-builder.service';

@Injectable()
export class DevicesService {
  private readonly logger = new Logger(DevicesService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly genieacsClient: GenieacsClientService,
    private readonly profileResolver: ProfileResolverService,
    private readonly tasksService: TasksService,
    private readonly payloadBuilder: TaskPayloadBuilderService,
  ) {}

  /**
   * Tarik daftar perangkat dari GenieACS NBI dan simpan/update ke PostgreSQL
   */
  async syncFromGenieACS(): Promise<{ synced: number }> {
    const rawDevices = await this.genieacsClient.getDevices();
    if (!rawDevices || rawDevices.length === 0) {
      return { synced: 0 };
    }

    // 1. Pre-load all existing devices (1 query instead of N queries)
    const existingDevices = await this.deviceRepo.find();
    const deviceMap = new Map<string, Device>();
    for (const ed of existingDevices) {
      deviceMap.set(ed.genieId, ed);
    }

    // 2. Cache profil yang sudah di-resolve agar tidak query berulang untuk model yang sama
    const profileCache = new Map<string, string | null>();
    const devicesToSave: Device[] = [];
    const now = new Date();

    for (const raw of rawDevices) {
      const genieId = raw._id;
      const serial = raw._deviceId?._SerialNumber || raw.VirtualParameters?.serial?._value || genieId;
      const mac = raw.VirtualParameters?.mac?._value || null;
      const oui = raw._deviceId?._OUI || '';
      const productClass = raw._deviceId?._ProductClass || '';
      const manufacturer = raw._deviceId?._Manufacturer || '';
      const model = raw.VirtualParameters?.model?._value || productClass;
      const firmware = raw.VirtualParameters?.firmware?._value || '';
      const wanIp = raw.VirtualParameters?.wanIP?._value || null;
      const uptime = parseInt(raw.VirtualParameters?.uptime?._value, 10) || 0;
      const rxPowerAcs = raw.VirtualParameters?.rxPower?._value || null;
      const lastInform = raw._lastInform ? new Date(raw._lastInform) : now;

      // Cek status online (inform kurang dari 10 menit lalu)
      const isOnline = Date.now() - lastInform.getTime() < 10 * 60 * 1000;
      const status = isOnline ? DeviceStatus.ONLINE : DeviceStatus.OFFLINE;

      // Resolve profile dengan in-memory cache
      const profileKey = `${oui}::${productClass}::${manufacturer}`;
      let resolvedProfileId: string | null = null;
      if (profileCache.has(profileKey)) {
        resolvedProfileId = profileCache.get(profileKey)!;
      } else {
        const resolved = await this.profileResolver.resolve({
          oui,
          productClass,
          manufacturer,
        });
        resolvedProfileId = resolved.profile?.id || null;
        profileCache.set(profileKey, resolvedProfileId);
      }

      let device = deviceMap.get(genieId);
      if (!device) {
        device = this.deviceRepo.create({
          genieId,
          serial,
          mac,
          oui,
          productClass,
          manufacturer,
          model,
          firmware,
          profileId: resolvedProfileId,
          wanIp,
          uptime,
          rxPowerAcs,
          status,
          lastInform,
        });
      } else {
        device.serial = serial;
        device.mac = mac;
        device.model = model;
        device.firmware = firmware;
        device.wanIp = wanIp;
        device.uptime = uptime;
        device.rxPowerAcs = rxPowerAcs;
        device.status = status;
        device.lastInform = lastInform;
        if (!device.profileId && resolvedProfileId) {
          device.profileId = resolvedProfileId;
        }
      }

      devicesToSave.push(device);
    }

    // 3. Batch save all devices in chunks of 100
    if (devicesToSave.length > 0) {
      await this.deviceRepo.save(devicesToSave, { chunk: 100 });
    }

    this.logger.log(`Sinkronisasi selesai: ${devicesToSave.length} perangkat diproses.`);
    return { synced: devicesToSave.length };
  }

  async findAll(query: {
    status?: DeviceStatus;
    search?: string;
    manufacturer?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Device> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.manufacturer) {
      where.manufacturer = Like(`%${query.manufacturer}%`);
    }

    const queryBuilder = this.deviceRepo
      .createQueryBuilder('device')
      .leftJoinAndSelect('device.profile', 'profile')
      .leftJoinAndSelect('device.customer', 'customer');

    if (query.status) {
      queryBuilder.andWhere('device.status = :st', { st: query.status });
    }
    if (query.manufacturer) {
      queryBuilder.andWhere('LOWER(device.manufacturer) LIKE LOWER(:mf)', {
        mf: `%${query.manufacturer}%`,
      });
    }
    if (query.search) {
      queryBuilder.andWhere(
        '(LOWER(device.serial) LIKE LOWER(:sc) OR LOWER(device.wan_ip) LIKE LOWER(:sc) OR LOWER(customer.name) LIKE LOWER(:sc))',
        { sc: `%${query.search}%` },
      );
    }

    queryBuilder.orderBy('device.last_inform', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      data: items,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepo.findOne({
      where: [{ id }, { genieId: id }, { serial: id }],
      relations: ['profile', 'customer'],
    });

    if (!device) {
      throw new NotFoundException(`Perangkat '${id}' tidak ditemukan`);
    }
    return device;
  }

  // ===========================================================================
  // REMOTE ACTIONS (Reboot, Reset, WiFi, PPPoE, Refresh)
  // ===========================================================================

  async reboot(id: string, userId?: string, ip?: string) {
    const device = await this.findOne(id);
    const task = await this.tasksService.createTaskRecord(device.id, TaskType.REBOOT, {}, userId);

    try {
      const res = await this.genieacsClient.reboot(device.genieId, true);
      await this.tasksService.markTaskSuccess(task.id, res);
      await this.tasksService.recordAudit(userId, 'REBOOT_MODEM', 'DEVICE', device.id, { serial: device.serial }, ip);
      return { success: true, message: 'Perintah reboot berhasil dikirim', task };
    } catch (err: any) {
      await this.tasksService.markTaskFailed(task.id, err.message);
      throw err;
    }
  }

  async factoryReset(id: string, userId?: string, ip?: string) {
    const device = await this.findOne(id);
    const task = await this.tasksService.createTaskRecord(device.id, TaskType.FACTORY_RESET, {}, userId);

    try {
      const res = await this.genieacsClient.factoryReset(device.genieId, true);
      await this.tasksService.markTaskSuccess(task.id, res);
      await this.tasksService.recordAudit(userId, 'FACTORY_RESET_MODEM', 'DEVICE', device.id, { serial: device.serial }, ip);
      return { success: true, message: 'Perintah factory reset berhasil dikirim', task };
    } catch (err: any) {
      await this.tasksService.markTaskFailed(task.id, err.message);
      throw err;
    }
  }

  async setWifi(id: string, payload: SetWifiPayload, userId?: string, ip?: string) {
    const device = await this.findOne(id);
    const paramValues = this.payloadBuilder.buildWifiParams(device.profile, payload);

    const task = await this.tasksService.createTaskRecord(device.id, TaskType.SET_WIFI, payload, userId);

    try {
      const res = await this.genieacsClient.setParameterValues(device.genieId, paramValues, true);
      if (res.queued) {
        await this.tasksService.markTaskQueued(task.id, res);
      } else {
        await this.tasksService.markTaskSuccess(task.id, res);
      }
      await this.tasksService.recordAudit(
        userId,
        'SET_WIFI',
        'DEVICE',
        device.id,
        { band: payload.band, ssid: payload.ssid },
        ip,
      );
      return { success: true, message: res.message || 'Konfigurasi Wi-Fi berhasil dikirim', task };
    } catch (err: any) {
      await this.tasksService.markTaskFailed(task.id, err.message);
      throw err;
    }
  }

  async setPppoe(id: string, payload: SetPppoePayload, userId?: string, ip?: string) {
    const device = await this.findOne(id);
    const paramValues = this.payloadBuilder.buildPppoeParams(device.profile, payload);

    const task = await this.tasksService.createTaskRecord(device.id, TaskType.SET_PPPOE, { username: payload.username }, userId);

    try {
      const res = await this.genieacsClient.setParameterValues(device.genieId, paramValues, true);
      if (res.queued) {
        await this.tasksService.markTaskQueued(task.id, res);
      } else {
        await this.tasksService.markTaskSuccess(task.id, res);
      }
      await this.tasksService.recordAudit(
        userId,
        'SET_PPPOE',
        'DEVICE',
        device.id,
        { username: payload.username },
        ip,
      );
      return { success: true, message: res.message || 'Konfigurasi PPPoE berhasil dikirim', task };
    } catch (err: any) {
      await this.tasksService.markTaskFailed(task.id, err.message);
      throw err;
    }
  }

  async refresh(id: string, userId?: string) {
    const device = await this.findOne(id);
    const root = device.profile?.rootModel === 'TR181' ? 'Device' : 'InternetGatewayDevice';
    const task = await this.tasksService.createTaskRecord(device.id, TaskType.REFRESH, { object: root }, userId);

    try {
      const res = await this.genieacsClient.refreshObject(device.genieId, root, true);
      await this.tasksService.markTaskSuccess(task.id, res);
      return { success: true, message: 'Perintah refresh parameter berhasil dikirim', task };
    } catch (err: any) {
      await this.tasksService.markTaskFailed(task.id, err.message);
      throw err;
    }
  }

  async assignCustomer(id: string, customerId: string | null) {
    const device = await this.findOne(id);
    device.customerId = customerId;
    return this.deviceRepo.save(device);
  }
}
