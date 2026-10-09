import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.customerRepo.findAndCount({
      relations: ['odp'],
      order: { customerNo: 'ASC' },
      skip,
      take: limit,
    });
    return { data: items, total, page, lastPage: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const customer = await this.customerRepo.findOne({ where: { id }, relations: ['odp'] });
    if (!customer) {
      throw new NotFoundException(`Customer '${id}' tidak ditemukan`);
    }
    return customer;
  }

  async create(data: {
    customerNo: string;
    name: string;
    phone?: string;
    address?: string;
    odpId?: string;
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

    const customer = this.customerRepo.create({
      customerNo: data.customerNo,
      name: data.name,
      phone: data.phone || null,
      address: data.address || null,
      odpId: data.odpId || null,
      geom,
    });
    return this.customerRepo.save(customer);
  }

  async update(
    id: string,
    data: {
      customerNo?: string;
      name?: string;
      phone?: string;
      address?: string;
      odpId?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    const customer = await this.findOne(id);
    if (data.customerNo !== undefined) customer.customerNo = data.customerNo;
    if (data.name !== undefined) customer.name = data.name;
    if (data.phone !== undefined) customer.phone = data.phone || null;
    if (data.address !== undefined) customer.address = data.address || null;
    if (data.odpId !== undefined) customer.odpId = data.odpId || null;

    if (data.lat !== undefined || data.lng !== undefined) {
      if (data.lat != null && data.lng != null) {
        const latNum = Number(data.lat);
        const lngNum = Number(data.lng);
        if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
          customer.geom = `SRID=4326;POINT(${lngNum.toFixed(7)} ${latNum.toFixed(7)})`;
        }
      } else {
        customer.geom = null;
      }
    }

    return this.customerRepo.save(customer);
  }

  async remove(id: string) {
    const customer = await this.findOne(id);
    await this.customerRepo.remove(customer);
    return { success: true };
  }

  async importBulk(records: any[]) {
    // Mitigasi ATK-03: Batasi batch size maksimal 1.000 record untuk mencegah OOM DoS
    if (records.length > 1000) {
      throw new BadRequestException('Maksimal 1.000 record per satu kali batch import');
    }

    const uniqueMap = new Map<string, any>();
    for (const r of records) {
      if (r.customerNo && !uniqueMap.has(r.customerNo)) {
        uniqueMap.set(r.customerNo, r);
      }
    }

    const uniqueRecords = Array.from(uniqueMap.values());
    if (uniqueRecords.length === 0) return { imported: 0 };

    const customerNos = uniqueRecords.map((r) => r.customerNo);
    const existing = await this.customerRepo.find({
      where: customerNos.map((cNo) => ({ customerNo: cNo })),
      select: ['customerNo'],
    });
    const existingSet = new Set(existing.map((e) => e.customerNo));

    const toInsert = uniqueRecords
      .filter((r) => !existingSet.has(r.customerNo))
      .map((r) => {
        let geom: string | null = null;
        if (r.lat != null && r.lng != null) {
          const latNum = Number(r.lat);
          const lngNum = Number(r.lng);
          // Mitigasi ReDoS & Geometry Injection: validasi rentang koordinat dan format ketat
          if (
            !isNaN(latNum) &&
            !isNaN(lngNum) &&
            latNum >= -90 &&
            latNum <= 90 &&
            lngNum >= -180 &&
            lngNum <= 180
          ) {
            geom = `SRID=4326;POINT(${lngNum.toFixed(7)} ${latNum.toFixed(7)})`;
          }
        }

        return this.customerRepo.create({
          customerNo: r.customerNo,
          name: r.name,
          phone: r.phone || null,
          address: r.address || null,
          geom,
        });
      });

    if (toInsert.length > 0) {
      await this.customerRepo.save(toInsert);
    }
    return { imported: toInsert.length };
  }
}
