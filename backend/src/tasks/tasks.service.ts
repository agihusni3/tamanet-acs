import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskType, TaskStatus } from './task.entity';
import { AuditLog } from '../audit/audit-log.entity';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async createTaskRecord(
    deviceId: string,
    type: TaskType,
    payload: Record<string, any>,
    userId?: string,
  ): Promise<Task> {
    const task = this.taskRepo.create({
      deviceId,
      type,
      payload,
      status: TaskStatus.RUNNING,
      userId,
    });
    return this.taskRepo.save(task);
  }

  async markTaskSuccess(taskId: string, result: any): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (task) {
      task.status = TaskStatus.SUCCESS;
      task.result = result;
      task.finishedAt = new Date();
      return this.taskRepo.save(task);
    }
    return null as any;
  }

  async markTaskQueued(taskId: string, result: any): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (task) {
      task.status = TaskStatus.PENDING;
      task.result = result;
      return this.taskRepo.save(task);
    }
    return null as any;
  }

  async markTaskFailed(taskId: string, error: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (task) {
      task.status = TaskStatus.FAILED;
      task.error = error;
      task.finishedAt = new Date();
      return this.taskRepo.save(task);
    }
    return null as any;
  }

  async recordAudit(
    userId: string | undefined,
    action: string,
    targetType: string,
    targetId: string,
    detail: Record<string, any>,
    ip?: string,
  ): Promise<void> {
    const log = this.auditRepo.create({
      userId,
      action,
      targetType,
      targetId,
      detail,
      ip,
    });
    await this.auditRepo.save(log);
  }

  async getTasks(deviceId?: string): Promise<Task[]> {
    if (deviceId) {
      return this.taskRepo.find({
        where: { deviceId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    }
    return this.taskRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getTask(id: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id }, relations: ['device', 'user'] });
    if (!task) {
      throw new NotFoundException(`Task dengan ID '${id}' tidak ditemukan`);
    }
    return task;
  }
}
