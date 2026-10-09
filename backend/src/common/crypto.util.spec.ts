import { encryptCredential, decryptCredential } from './crypto.util';

describe('CryptoUtil (Device Credential Encryption)', () => {
  it('harus mengenkripsi dan mendekripsi password OLT dengan benar', () => {
    const rawPassword = 'MySecretOltPassword!2026';
    const encrypted = encryptCredential(rawPassword);

    expect(encrypted).not.toBe(rawPassword);
    expect(encrypted.startsWith('enc:v1:')).toBe(true);

    const decrypted = decryptCredential(encrypted);
    expect(decrypted).toBe(rawPassword);
  });

  it('harus mempertahankan string masked •••••••• tanpa mengenkripsi ulang', () => {
    const masked = '••••••••';
    expect(encryptCredential(masked)).toBe(masked);
  });

  it('harus mendukung backwards compatibility untuk password lama yang belum dienkripsi', () => {
    const legacyPlain = 'admin';
    expect(decryptCredential(legacyPlain)).toBe('admin');
  });
});
