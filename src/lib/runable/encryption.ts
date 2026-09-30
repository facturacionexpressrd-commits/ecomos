/**
 * Runable API Key Encryption
 *
 * Securely encrypts and decrypts Runable API keys for storage in database
 * Uses AES-256-GCM encryption with the master key from environment
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.RUNABLE_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('RUNABLE_ENCRYPTION_KEY not set - Runable API keys will not be encrypted');
}

/**
 * Generate a new encryption key
 * Run this once to create a key for your environment:
 * openssl rand -hex 32
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt a plaintext string (Runable API key)
 */
export function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('RUNABLE_ENCRYPTION_KEY not configured');
  }

  // Generate a random IV
  const iv = crypto.randomBytes(16);

  // Create cipher
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  // Encrypt
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return: IV + authTag + encrypted data (all as hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a ciphertext string
 */
export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('RUNABLE_ENCRYPTION_KEY not configured');
  }

  // Parse: IV:authTag:encrypted
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    iv
  );

  decipher.setAuthTag(authTag);

  // Decrypt
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Test encryption/decryption
 */
export function testEncryption(): boolean {
  try {
    const testKey = 'test_runable_key_12345';
    const encrypted = encrypt(testKey);
    const decrypted = decrypt(encrypted);
    return decrypted === testKey;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

// Test on module load in development
if (process.env.NODE_ENV === 'development' && ENCRYPTION_KEY) {
  const testPassed = testEncryption();
  if (!testPassed) {
    console.error('⚠️  Runable encryption test failed - API keys may not be stored securely');
  } else {
    console.log('✓ Runable encryption initialized');
  }
}
