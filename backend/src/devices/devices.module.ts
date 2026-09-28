import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './device.entity';
import { DevicesService } from './devices.service';
import { DevicesController } from './devices.controller';
import { GenieacsClientService } from '../genieacs/genieacs-client.service';
import { ProfilesModule } from '../profiles/profiles.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Device]),
    ProfilesModule,
    TasksModule,
  ],
  controllers: [DevicesController],
  providers: [DevicesService, GenieacsClientService],
  exports: [DevicesService, GenieacsClientService],
})
export class DevicesModule {}
