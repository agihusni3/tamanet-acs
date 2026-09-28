import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth/auth.service';
import { ProfileResolverService } from './profiles/profile-resolver.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Inisialisasi Akun Admin Default & Seed Profil Modem Huawei / Zimlink
  try {
    const authService = app.get(AuthService);
    await authService.createAdminIfNotExists();
    logger.log('✓ Akun default admin siap: admin / admin123');

    const profileResolver = app.get(ProfileResolverService);
    await profileResolver.seedDefaultProfiles();
    logger.log('✓ Profil modem Huawei & Zimlink siap');
  } catch (err: any) {
    logger.warn(`Inisialisasi awal DB: ${err.message}`);
  }

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 ACS Backend API berjalan di http://localhost:${port}`);
}

bootstrap();
