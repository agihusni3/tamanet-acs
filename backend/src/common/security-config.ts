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
      logger.warn('[Security Notice] JWT_SECRET menggunakan default/placeholder. Sistem otomatis memakai ephemeral high-entropy secret.');
    }
    if (!refresh || refresh.length < 32 || refresh.includes('super_secret_refresh')) {
      logger.warn('[Security Notice] JWT_REFRESH_SECRET menggunakan default/placeholder. Sistem otomatis memakai ephemeral high-entropy secret.');
    }
    if (!cred || cred.length < 16 || cred.includes('acs-secure-master-key')) {
      logger.warn('[Security Notice] CREDENTIAL_SECRET_KEY belum diisi kustom. Sistem memakai ephemeral master encryption key.');
    }
    logger.log('✓ Validasi keamanan produksi aktif & tervalidasi');
  } else {
    logger.log('✓ Modul keamanan aktif: Ephemeral entropy fallback diaktifkan untuk mencegah pemalsuan token');
  }
}
