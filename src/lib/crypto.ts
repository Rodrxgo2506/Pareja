import CryptoJS from 'crypto-js';

/**
 * Encrypts a plaintext string using AES symmetric encryption with the provided key.
 */
export function encrypt(text: string, key: string): string {
  if (!text || !key) return '';
  try {
    return CryptoJS.AES.encrypt(text, key).toString();
  } catch (error) {
    console.error('Error encrypting text:', error);
    return '';
  }
}

/**
 * Decrypts a ciphertext string using AES symmetric encryption with the provided key.
 */
export function decrypt(cipherText: string, key: string): string {
  if (!cipherText || !key) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    if (!decryptedText) {
      // If decryption succeeded but yielded empty string, it could be bad password
      return '';
    }
    return decryptedText;
  } catch (error) {
    // Decryption failed (usually due to a bad password or corrupted data)
    return '';
  }
}

/**
 * Helper to encrypt a full object as a JSON string.
 */
export function encryptObject<T>(obj: T, key: string): string {
  try {
    return encrypt(JSON.stringify(obj), key);
  } catch (error) {
    console.error('Error encrypting object:', error);
    return '';
  }
}

/**
 * Helper to decrypt and parse a JSON string into its original object.
 */
export function decryptObject<T>(cipherText: string, key: string): T | null {
  const decryptedStr = decrypt(cipherText, key);
  if (!decryptedStr) return null;
  try {
    return JSON.parse(decryptedStr) as T;
  } catch (error) {
    console.error('Error parsing decrypted object:', error);
    return null;
  }
}

/**
 * Hashes the password using SHA-256. This is stored in local preferences
 * only to verify if the user entered the correct password upon reopening the app,
 * but NEVER stored alongside the actual plaintext secret keys.
 */
export function hashKey(key: string): string {
  try {
    return CryptoJS.SHA256(key).toString();
  } catch (error) {
    console.error('Error hashing key:', error);
    return '';
  }
}
