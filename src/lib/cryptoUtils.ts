
/**
 * Utility functions for client-side encryption using the Web Crypto API.
 * Uses AES-256-GCM for encryption and PBKDF2 for key derivation.
 */

const ITERATIONS = 100000;
const KEY_LENGTH = 256;
const ALGO = 'AES-GCM';

/**
 * Generates a random salt.
 */
export function generateRandomSalt(): string {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

/**
 * Derives a CryptoKey from a password and salt.
 */
export async function deriveKey(password: string, saltBase64: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = new Uint8Array(
    atob(saltBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts cleartext using a CryptoKey.
 * Returns data in format "ivBase64:ciphertextBase64"
 */
export async function encryptData(text: string, key: CryptoKey): Promise<string> {
  if (!text) return '';
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    data
  );

  const ivBase64 = btoa(String.fromCharCode(...iv));
  const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

  return `${ivBase64}:${encryptedBase64}`;
}

/**
 * Decrypts data in format "ivBase64:ciphertextBase64" using a CryptoKey.
 */
export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  if (!encryptedData) return '';
  const [ivBase64, ciphertextBase64] = encryptedData.split(':');
  
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = new Uint8Array(
    atob(ivBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const ciphertext = new Uint8Array(
    atob(ciphertextBase64)
      .split('')
      .map((c) => c.charCodeAt(0))
  );

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
