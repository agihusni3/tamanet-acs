import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TaskPayloadBuilderService } from './task-payload-builder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Task, AuditLog])],
  controllers: [TasksController],
  providers: [TasksService, TaskPayloadBuilderService],
  exports: [TasksService, TaskPayloadBuilderService],
})
export class TasksModule {}
