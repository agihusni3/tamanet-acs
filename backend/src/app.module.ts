import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { DevicesModule } from './devices/devices.module';
import { TasksModule } from './tasks/tasks.module';
import { CustomersModule } from './customers/customers.module';
import { NetworkAssetsModule } from './network-assets/network-assets.module';
import { OltCollectorModule } from './olt-collector/olt-collector.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgresql://acs_admin:postgres_super_secret_change_me@postgres:5432/acs_db',
      autoLoadEntities: true,
      synchronize: true, // Untuk kemudahan setup skema otomatis awal
      logging: false,
    }),
    AuthModule,
    ProfilesModule,
    DevicesModule,
    TasksModule,
    CustomersModule,
    NetworkAssetsModule,
    OltCollectorModule,
  ],
})
export class AppModule {}
