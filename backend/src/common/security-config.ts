import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('SecurityConfig');

// Kunci fallback acak berbasis entropy tinggi (256-bit) yang dibuat saat memori boot
// Mencegah eksploitasi pemalsuan token dari penyerang luar jika .env belum diatur
const EPHEMERAL_JWT_SECRET = crypto.randomBytes(48).toString('hex');
const EPHEMERAL_REFRESH_SECRET = crypto.randomBytes(48).toString('hex');
const EPHEMERAL_CREDENTIAL_SECRET = crypto.randomBytes(32).toString('hex');

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || EPHEMERAL_JWT_SECRET;
}

export function getJwtRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || EPHEMERAL_REFRESH_SECRET;
}

export function getCredentialSecret(): string {
  return process.env.CREDENTIAL_SECRET_KEY || EPHEMERAL_CREDENTIAL_SECRET;
}

/**
 * Validasi ketat pengerasan keamanan saat aplikasi di-bootstrap di lingkungan produksi (Production Hardening)
 */
export function validateProductionSecurity(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const jwt = process.env.JWT_SECRET;
  const refresh = process.env.JWT_REFRESH_SECRET;
  const cred = process.env.CREDENTIAL_SECRET_KEY;

  if (isProd) {
    if (!jwt || jwt.length < 32 || jwt.includes('super_secret_jwt_key_replace')) {
      logger.error('CRITICAL FATAL SECURITY ERROR: JWT_SECRET belum dikonfigurasi dengan aman di mode produksi!');
      process.exit(1);
    }
    if (!refresh || refresh.length < 32 || refresh.includes('super_secret_refresh')) {
      logger.error('CRITICAL FATAL SECURITY ERROR: JWT_REFRESH_SECRET belum dikonfigurasi dengan aman di mode produksi!');
      process.exit(1);
    }
    if (!cred || cred.length < 16 || cred.includes('acs-secure-master-key')) {
      logger.error('CRITICAL FATAL SECURITY ERROR: CREDENTIAL_SECRET_KEY belum dikonfigurasi dengan aman di mode produksi!');
      process.exit(1);
    }
    logger.log('✓ Validasi kunci keamanan produksi lulus verifikasi (AES-256 / SHA-256)');
  } else {
    logger.log('✓ Modul keamanan aktif: Ephemeral entropy fallback diaktifkan untuk mencegah pemalsuan token');
  }
}
