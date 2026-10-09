/**
 * Utility untuk proteksi dan enkripsi kredensial perangkat (OLT / Router) di sisi client.
 * Mencegah kredensial tersimpan dalam bentuk teks polos (plain text) di localStorage atau session.
 */

const VAULT_PREFIX = 'vault:v1:';
const CLIENT_SALT = 'acs-vault-client-key-2026';

function xorTransform(input: string, salt: string): string {
  let output = '';
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i) ^ salt.charCodeAt(i % salt.length);
    output += String.fromCharCode(charCode);
  }
  return output;
}

/**
 * Enkripsi kredensial sebelum disimpan ke localStorage (Protection at Rest).
 */
export function encryptClientVault(plainText: string): string {
  if (!plainText || plainText.trim() === '' || plainText === '••••••••') {
    return plainText;
  }
  if (plainText.startsWith(VAULT_PREFIX) || plainText.startsWith('enc:v1:')) {
    return plainText;
  }

  try {
    const transformed = xorTransform(plainText, CLIENT_SALT);
    // Encode to base64
    const base64 = btoa(unescape(encodeURIComponent(transformed)));
    return `${VAULT_PREFIX}${base64}`;
  } catch (e) {
    return plainText;
  }
}

/**
 * Dekripsi kredensial dari localStorage saat dibutuhkan oleh form atau tombol salin.
 */
export function decryptClientVault(cipherText: string): string {
  if (!cipherText) return '';
  if (!cipherText.startsWith(VAULT_PREFIX)) {
    return cipherText;
  }

  try {
    const base64 = cipherText.slice(VAULT_PREFIX.length);
    const decoded = decodeURIComponent(escape(atob(base64)));
    return xorTransform(decoded, CLIENT_SALT);
  } catch (e) {
    return cipherText;
  }
}
