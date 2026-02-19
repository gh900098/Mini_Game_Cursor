import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';
import { EncryptionService } from '../apps/api/src/modules/encryption/encryption.service';
import { Member } from '../apps/api/src/modules/members/entities/member.entity';
import { User } from '../apps/api/src/modules/users/entities/user.entity';
import { VerificationCode } from '../apps/api/src/modules/auth/entities/verification-code.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const encryptionService = app.get(EncryptionService);

    // Repositories
    const memberRepo = app.get<Repository<Member>>(getRepositoryToken(Member));
    const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
    const codeRepo = app.get<Repository<VerificationCode>>(getRepositoryToken(VerificationCode));

    console.log('Starting PII Encryption Migration...');

    // 1. Members
    console.log('Migrating Members...');
    const members = await memberRepo.find({ select: ['id', 'email', 'phoneNumber', 'address', 'metadata'] }); // Select plaintext columns (Note: Transformer might already interfere if we are not careful)

    // IMPORTANT: If transformer is active, 'find' might try to decrypt. 
    // If data is currently PLAINTEXT, decrypt will return original text (because of our try/catch fallback in decrypt).
    // So member.email will be "plaintext".

    for (const member of members) {
        let changed = false;

        // Hashing (Blind Index)
        if (member.email && !member.emailHash) { // Only if hash missing? Or force update? Force update to be safe.
            // But wait, member.email is coming from DB. 
            // If it's plaintext "bob@example.com", hash it.
            // If it's ciphertext, decrypt() handles it? 
            // We need raw access to check if it's already encrypted? 
            // Or rely on IDempotency?

            // Strategy:
            // 1. Read (Transformer decrypts or returns plaintext).
            // 2. Compute Hash.
            // 3. Save (Transformer encrypts).

            // Issue: If we run this twice, member.email is now Encrypted.
            // decrypt() decrypts it. we get plaintext. 
            // hash(plaintext) -> Same hash.
            // save() -> re-encrypts.
            // So it is idempotent!
        }

        // We just need to trigger a save() on the entity.
        // The Hooks (@BeforeUpdate) will calculate the hashes.
        // The Transformer (ValueTransformer) will encrypt the values.

        // METADATA SANITIZATION
        if (member.metadata) {
            const meta = { ...member.metadata };
            let metaChanged = false;
            ['email', 'mobile', 'phone', 'phoneNumber', 'address'].forEach(key => {
                if (key in meta) {
                    delete meta[key];
                    metaChanged = true;
                }
            });
            if (metaChanged) {
                member.metadata = meta;
                changed = true;
            }
        }

        // We allow 'save' to trigger hooks and transformers
        // Even if 'changed' is false, we might want to force save to ensure encryption happens if it wasn't encrypted.
        // But how do we know? 
        // We can just save everyone. It's safer.
        await memberRepo.save(member);
    }
    console.log(`Processed ${members.length} members.`);

    // 2. Users
    console.log('Migrating Users...');
    const users = await userRepo.find();
    for (const user of users) {
        await userRepo.save(user); // Triggers hooks (hash) and transformer (encrypt)
    }
    console.log(`Processed ${users.length} users.`);

    // 3. VerificationCodes
    console.log('Migrating VerificationCodes...');
    const codes = await codeRepo.find();
    for (const code of codes) {
        await codeRepo.save(code);
    }
    console.log(`Processed ${codes.length} codes.`);

    console.log('Migration Complete.');
    await app.close();
}

bootstrap();
