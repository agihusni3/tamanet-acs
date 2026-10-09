import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    action?: string;
    targetType?: string;
    search?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .select([
        'log.id',
        'log.action',
        'log.targetType',
        'log.targetId',
        'log.detail',
        'log.ip',
        'log.createdAt',
        'user.id',
        'user.username',
        'user.role',
      ])
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.action) {
      qb.andWhere('log.action = :act', { act: query.action });
    }

    if (query.targetType) {
      qb.andWhere('log.targetType = :tt', { tt: query.targetType });
    }

    if (query.search) {
      qb.andWhere(
        '(LOWER(log.action) LIKE LOWER(:s) OR LOWER(log.targetId) LIKE LOWER(:s) OR LOWER(user.username) LIKE LOWER(:s))',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }
}
