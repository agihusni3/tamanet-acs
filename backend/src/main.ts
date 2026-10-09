import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AuthService } from './auth/auth.service';
import { ProfileResolverService } from './profiles/profile-resolver.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 1. HTTP Security Headers (OWASP A05:2021)
  app.use(
    helmet({
      contentSecurityPolicy: false, // Dikelola oleh Nginx reverse proxy
      crossOriginEmbedderPolicy: false,
    }),
  );

  // 2. Strict CORS Configuration (OWASP A01:2021)
  const rawOrigins = process.env.ALLOWED_ORIGINS || '';
  const configuredOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const defaultLocalOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:80',
    'http://127.0.0.1:80',
  ];

  const allowedOrigins = Array.from(new Set([...defaultLocalOrigins, ...configuredOrigins]));

  app.enableCors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (curl, mobile apps, local server-to-server)
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        logger.warn(`[Security Alert] Akses CORS ditolak untuk origin tidak sah: ${origin}`);
        callback(new Error('Akses ditolak oleh kebijakan keamanan CORS'));
      }
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    maxAge: 86400, // Cache preflight 24 jam
  });

  // 3. Strict Input Validation & Anti Mass-Assignment (OWASP A03 / A08)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 4. Verifikasi Keamanan Kunci JWT & Kredensial (OWASP A02:2021)
  const { validateProductionSecurity } = await import('./common/security-config');
  validateProductionSecurity();

  // 5. Inisialisasi Akun Admin Default & Seed Profil Modem
  try {
    const authService = app.get(AuthService);
    await authService.createAdminIfNotExists();

    const profileResolver = app.get(ProfileResolverService);
    await profileResolver.seedDefaultProfiles();
    logger.log('✓ Sistem siap & modul keamanan aktif');
  } catch (err: any) {
    logger.warn(`Inisialisasi awal DB: ${err.message}`);
  }

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 ACS Backend API berjalan dengan pengerasan keamanan di http://localhost:${port}`);
}

bootstrap();
