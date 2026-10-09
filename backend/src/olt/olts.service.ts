import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Olt, PonType } from './olt.entity';
import { PonPort } from './pon-port.entity';
import { Onu, OnuStatus } from './onu.entity';
import { encryptCredential } from '../common/crypto.util';

import { CreateOltDto } from './dto/create-olt.dto';
import { UpdateOltDto } from './dto/update-olt.dto';

export { CreateOltDto, UpdateOltDto };

@Injectable()
export class OltsService {
  private readonly logger = new Logger(OltsService.name);

  constructor(
    @InjectRepository(Olt)
    private readonly oltRepo: Repository<Olt>,
    @InjectRepository(PonPort)
    private readonly portRepo: Repository<PonPort>,
    @InjectRepository(Onu)
    private readonly onuRepo: Repository<Onu>,
  ) {}

  /**
   * Mengambil semua OLT dari database server dan memformat port & statistik ONU
   */
  async findAll() {
    const olts = await this.oltRepo.find({
      relations: ['ports', 'ports.onus'],
      order: { name: 'ASC' },
    });

    return olts.map((olt) => this.mapToResponse(olt));
  }

  async findOne(id: string) {
    const olt = await this.oltRepo.findOne({
      where: { id },
      relations: ['ports', 'ports.onus'],
    });

    if (!olt) {
      throw new NotFoundException(`OLT dengan ID '${id}' tidak ditemukan di server`);
    }

    return this.mapToResponse(olt);
  }

  /**
   * Tambah OLT baru ke server
   */
  async create(dto: CreateOltDto) {
    const olt = this.oltRepo.create({
      name: dto.name,
      vendor: dto.vendor,
      model: dto.model,
      ip: dto.ip,
      webPort: dto.webPort || 80,
      cliPort: dto.cliPort || 23,
      ponType: dto.ponType === 'GPON' ? PonType.GPON : PonType.EPON,
      ponPortsCount: dto.ponPortsCount || (dto.ponPorts?.length ?? 2),
      snmpCommunity: dto.snmpCommunity || 'public',
      defaultUser: dto.defaultUser || 'admin',
      defaultPass: dto.defaultPass ? encryptCredential(dto.defaultPass) : '',
      uptime: dto.uptime || 'Baru didaftarkan',
    });

    const savedOlt = await this.oltRepo.save(olt);

    // Buat port PON di database server
    const portCount = savedOlt.ponPortsCount || 2;
    const portsToCreate: PonPort[] = [];

    for (let i = 1; i <= portCount; i++) {
      const customPort = dto.ponPorts?.find((p) => (p.id ?? p.port) === i);
      const port = this.portRepo.create({
        oltId: savedOlt.id,
        port: i,
        slot: 1,
        label: customPort?.name || `PON ${i}`,
        description: customPort?.description || '',
      });
      portsToCreate.push(port);
    }

    if (portsToCreate.length > 0) {
      await this.portRepo.save(portsToCreate);
    }

    this.logger.log(`OLT '${savedOlt.name}' (${savedOlt.ip}) berhasil ditambahkan ke server.`);
    return this.findOne(savedOlt.id);
  }

  /**
   * Update informasi OLT di server
   */
  async update(id: string, dto: UpdateOltDto) {
    const olt = await this.oltRepo.findOne({
      where: { id },
      relations: ['ports'],
    });

    if (!olt) {
      throw new NotFoundException(`OLT dengan ID '${id}' tidak ditemukan`);
    }

    if (dto.name !== undefined) olt.name = dto.name;
    if (dto.vendor !== undefined) olt.vendor = dto.vendor;
    if (dto.model !== undefined) olt.model = dto.model;
    if (dto.ip !== undefined) olt.ip = dto.ip;
    if (dto.webPort !== undefined) olt.webPort = dto.webPort;
    if (dto.cliPort !== undefined) olt.cliPort = dto.cliPort;
    if (dto.ponType !== undefined) olt.ponType = dto.ponType === 'GPON' ? PonType.GPON : PonType.EPON;
    if (dto.snmpCommunity !== undefined) olt.snmpCommunity = dto.snmpCommunity;
    if (dto.defaultUser !== undefined) olt.defaultUser = dto.defaultUser;
    if (dto.defaultPass !== undefined && dto.defaultPass !== '••••••••') {
      olt.defaultPass = encryptCredential(dto.defaultPass);
    }
    if (dto.uptime !== undefined) olt.uptime = dto.uptime;

    // Jika jumlah port diubah
    if (dto.ponPortsCount && dto.ponPortsCount !== olt.ponPortsCount) {
      const currentPorts = olt.ports || [];
      const newCount = dto.ponPortsCount;

      if (newCount > currentPorts.length) {
        // Tambahkan port baru
        const addedPorts: PonPort[] = [];
        for (let i = currentPorts.length + 1; i <= newCount; i++) {
          addedPorts.push(
            this.portRepo.create({
              oltId: olt.id,
              port: i,
              slot: 1,
              label: `PON ${i}`,
              description: '',
            }),
          );
        }
        await this.portRepo.save(addedPorts);
      } else if (newCount < currentPorts.length) {
        // Hapus port yang melebihi
        const portsToDelete = currentPorts.filter((p) => p.port > newCount);
        if (portsToDelete.length > 0) {
          await this.portRepo.remove(portsToDelete);
        }
      }
      olt.ponPortsCount = newCount;
    }

    // Jika ada pembaruan port PON (keterangan area atau nama port)
    if (dto.ponPorts && Array.isArray(dto.ponPorts)) {
      const currentPorts = await this.portRepo.find({ where: { oltId: id } });
      for (const pDto of dto.ponPorts) {
        const portNum = pDto.port ?? pDto.id;
        if (!portNum) continue;
        const portEntity = currentPorts.find((p) => p.port === portNum);
        if (portEntity) {
          if (pDto.name !== undefined) portEntity.label = pDto.name;
          if (pDto.description !== undefined) portEntity.description = pDto.description;
          await this.portRepo.save(portEntity);
        }
      }
    }

    await this.oltRepo.save(olt);
    return this.findOne(id);
  }

  /**
   * Update label atau keterangan area dari port PON tertentu
   */
  async updatePort(oltId: string, portNumber: number, dto: { name?: string; description?: string }) {
    let port = await this.portRepo.findOne({
      where: { oltId, port: portNumber },
    });

    if (!port) {
      port = this.portRepo.create({
        oltId,
        port: portNumber,
        slot: 1,
        label: dto.name || `PON ${portNumber}`,
        description: dto.description || '',
      });
    } else {
      if (dto.name !== undefined) port.label = dto.name;
      if (dto.description !== undefined) port.description = dto.description;
    }

    await this.portRepo.save(port);
    this.logger.log(`Port PON ${portNumber} pada OLT ${oltId} diperbarui: area='${port.description}'`);
    return this.findOne(oltId);
  }

  /**
   * Hapus OLT dari database server
   */
  async remove(id: string) {
    const olt = await this.oltRepo.findOne({ where: { id } });
    if (!olt) {
      throw new NotFoundException(`OLT dengan ID '${id}' tidak ditemukan`);
    }

    await this.oltRepo.remove(olt);
    this.logger.log(`OLT '${olt.name}' (${id}) telah dihapus dari server.`);
    return { success: true, message: `OLT ${olt.name} berhasil dihapus` };
  }

  /**
   * Transformasi entity ke bentuk response JSON untuk frontend
   */
  private mapToResponse(olt: Olt) {
    const sortedPorts = (olt.ports || []).sort((a, b) => a.port - b.port);

    const ponPorts = sortedPorts.map((p) => {
      const onus = p.onus || [];
      const online = onus.filter((o) => o.status === OnuStatus.ONLINE).length;
      const offline = onus.filter((o) => o.status === OnuStatus.OFFLINE).length;
      return {
        id: p.port,
        port: p.port,
        name: p.label || `PON ${p.port}`,
        description: p.description || '',
        total: onus.length,
        online,
        offline,
      };
    });

    const totalOnu = ponPorts.reduce((acc, p) => acc + p.total, 0);
    const onlineOnu = ponPorts.reduce((acc, p) => acc + p.online, 0);
    const offlineOnu = ponPorts.reduce((acc, p) => acc + p.offline, 0);

    return {
      id: olt.id,
      name: olt.name,
      vendor: olt.vendor,
      model: olt.model,
      ip: olt.ip,
      webPort: olt.webPort ?? 80,
      cliPort: olt.cliPort ?? 23,
      ponType: olt.ponType,
      ponPortsCount: olt.ponPortsCount ?? sortedPorts.length,
      snmpCommunity: olt.snmpCommunity,
      totalOnu,
      onlineOnu,
      offlineOnu,
      defaultUser: olt.defaultUser || 'admin',
      hasPassword: Boolean(olt.defaultPass || olt.cliPass),
      defaultPass: olt.defaultPass ? '••••••••' : '',
      uptime: olt.uptime || 'Online',
      ponPorts,
    };
  }
}
