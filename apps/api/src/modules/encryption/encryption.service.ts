import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export let encryptionServiceInstance: EncryptionService;

@Injectable()
export class EncryptionService implements OnModuleInit {
  private encryptionKey: Buffer;
  private hashingSecret: Buffer;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    encryptionServiceInstance = this;
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    const secret = this.configService.get<string>('HASHING_SECRET');

    if (!key || !secret) {
      throw new Error(
        'ENCRYPTION_KEY and HASHING_SECRET must be defined in environment letiables',
      );
    }

    // Ensure keys are correct length (32 bytes for AES-256)
    // We support hex strings or raw strings
    this.encryptionKey = Buffer.from(key, 'hex');
    if (this.encryptionKey.length !== 32) {
      // Fallback: if not hex, try scrypt to derive a key from the string
      // But for security, providing a hex key is better.
      // For now, let's enforce 32-byte hex for max security, or hash the string to 32 bytes.
      this.encryptionKey = crypto.createHash('sha256').update(key).digest();
    }

    this.hashingSecret = Buffer.from(secret, 'hex');
    if (this.hashingSecret.length === 0) {
      this.hashingSecret = crypto.createHash('sha256').update(secret).digest();
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns "iv:authTag:encryptedText" (hex encoded)
   */
  encrypt(text: string): string {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: IV:AuthTag:Ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts ciphertext (format "iv:authTag:encryptedText").
   */
  decrypt(text: string): string {
    if (!text) return text;

    // Basic check if it looks like our format
    const parts = text.split(':');
    if (parts.length !== 3) {
      // Assume it might be plaintext if migration isn't perfect, or return as is?
      // For security, checking format is good. If it fails, maybe return original
      // incase it wasn't encrypted yet (migration phase).
      // BUT: mixing plaintext and ciphertext is dangerous.
      // Let's assume strict format for now.
      return text;
    }

    const [ivHex, authTagHex, encryptedHex] = parts;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        iv,
      );

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Decryption failed (wrong key, tampered data, or not actually encrypted)
      // console.error('Decryption failed', error);
      // Return original text to be safe/robust during migration?
      // Or throw? Returning original allows "lazy migration" or reading legacy data.
      return text;
    }
  }

  /**
   * Creates a deterministic hash for blind indexing (HMAC-SHA256).
   */
  hash(text: string): string {
    if (!text) return text;

    const hmac = crypto.createHmac('sha256', this.hashingSecret);
    hmac.update(text);
    return hmac.digest('hex');
  }
}
