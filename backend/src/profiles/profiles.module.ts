import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeviceProfile } from './device-profile.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { ProfileResolverService } from './profile-resolver.service';

@Module({
  imports: [TypeOrmModule.forFeature([DeviceProfile])],
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfileResolverService],
  exports: [ProfilesService, ProfileResolverService],
})
export class ProfilesModule {}
