import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { DevicesModule } from './devices/devices.module';
import { TasksModule } from './tasks/tasks.module';
import { CustomersModule } from './customers/customers.module';
import { NetworkAssetsModule } from './network-assets/network-assets.module';
import { OltCollectorModule } from './olt-collector/olt-collector.module';
import { OltsModule } from './olt/olts.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10, // Max 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100, // Max 100 requests per minute
      },
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url:
        process.env.DATABASE_URL ||
        'postgresql://acs_admin:postgres_super_secret_change_me@postgres:5432/acs_db',
      autoLoadEntities: true,
      synchronize: process.env.TYPEORM_SYNC !== 'false', // Otomatis buat tabel saat deploy perdana
      logging: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    ProfilesModule,
    DevicesModule,
    TasksModule,
    CustomersModule,
    NetworkAssetsModule,
    OltCollectorModule,
    OltsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
