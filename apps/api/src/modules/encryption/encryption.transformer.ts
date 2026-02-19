import { ValueTransformer } from 'typeorm';
import { encryptionServiceInstance } from './encryption.service';

export class EncryptionTransformer implements ValueTransformer {
    to(value: string | null | undefined): string | null {
        if (!value) return null;
        if (!encryptionServiceInstance) {
            console.warn('EncryptionService not initialized yet, returning plaintext');
            return value;
        }
        return encryptionServiceInstance.encrypt(value);
    }

    from(value: string | null | undefined): string | null {
        if (!value) return null;
        if (!encryptionServiceInstance) {
            return value;
        }
        return encryptionServiceInstance.decrypt(value);
    }
}
