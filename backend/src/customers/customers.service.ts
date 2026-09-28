import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(data: Partial<Customer>) {
    const customer = this.customerRepo.create(data);
    return this.customerRepo.save(customer);
  }

  async update(id: string, data: Partial<Customer>) {
    const customer = await this.findOne(id);
    Object.assign(customer, data);
    return this.customerRepo.save(customer);
  }

  async remove(id: string) {
    const customer = await this.findOne(id);
    await this.customerRepo.remove(customer);
    return { success: true };
  }

  async importBulk(records: any[]) {
    let created = 0;
    for (const r of records) {
      const exists = await this.customerRepo.findOne({ where: { customerNo: r.customerNo } });
      if (!exists) {
        const item = this.customerRepo.create({
          customerNo: r.customerNo,
          name: r.name,
          phone: r.phone || null,
          address: r.address || null,
          geom: r.lat && r.lng ? `SRID=4326;POINT(${r.lng} ${r.lat})` : null,
        });
        await this.customerRepo.save(item);
        created++;
      }
    }
    return { imported: created };
  }
}
