import * as crypto from 'crypto';
import { getCredentialSecret } from './security-config';

/**
 * Kunci enkripsi untuk kredensial perangkat (OLT, MikroTik, Switch).
 * Menggunakan standar industri AES-256-GCM (Encryption at Rest).
 */
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const DEFAULT_SALT = 'project-acs-olt-credential-salt-2026';

function getEncryptionKey(): Buffer {
  return crypto.scryptSync(getCredentialSecret(), DEFAULT_SALT, 32);
}

/**
 * Enkripsi kata sandi kredensial perangkat sebelum disimpan ke database.
 * Menghasilkan string berformat: enc:v1:<iv_hex>:<tag_hex>:<cipher_hex>
 */
export function encryptCredential(plainText: string): string {
  if (!plainText || plainText.trim() === '' || plainText === '••••••••') {
    return plainText;
  }
  // Jika sudah terenkripsi, jangan enkripsi ulang
  if (plainText.startsWith('enc:v1:')) {
    return plainText;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Dekripsi kata sandi kredensial perangkat saat service kolektor/driver
 * perlu login ke OLT fisik via Telnet/SSH/API.
 */
export function decryptCredential(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith('enc:v1:')) {
    // Backwards compatibility: jika masih data lama (plain text)
    return cipherText || '';
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 5) {
      return cipherText;
    }

    const ivHex = parts[2];
    const tagHex = parts[3];
    const encryptedHex = parts[4];

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // Jika gagal dekripsi (misal key berubah), kembalikan kosong/fallback aman
    return '';
  }
}
