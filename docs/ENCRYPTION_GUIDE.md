# Secure PII Encryption Guide

## Overview
We have implemented AES-256-GCM encryption for sensitive data (`email`, `phoneNumber`, `address`, `mobile`) and HMAC-SHA256 blind indexing for searchability.

## 1. Environment Setup (CRITICAL)
You **MUST** add the following keys to your `.env` file before restarting the application.

```bash
# 32-byte hex string (64 characters)
ENCRYPTION_KEY=5f1d3c...
# 32-byte hex string (64 characters)
HASHING_SECRET=1a2b3c...
```
*Tip: You can generate these using `openssl rand -hex 32`.*

## 2. Deployment
1.  Update `.env` with the keys.
2.  Restart the application to apply schema changes (TypeORM `synchronize` will add the `*Hash` columns).
    ```bash
    docker compose -f docker-compose.prod.yml restart api
    ```

## 3. Data Migration
To encrypt existing plaintext data, you must run the migration script. 
1.  Enter the API container or run locally (ensuring `.env` is accessible).
2.  Run the script:

```bash
# If running locally with ts-node
npx ts-node scripts/migration-encrypt-pii.ts

# If running strictly in production (compiled)
# You might need to compile the script or just copy the logic.
# Recommended: Run locally connected to the remote DB if possible, or build a one-off container.
```

## 4. Verification
1.  **Check Database**: `SELECT email, emailHash FROM members;`
    *   `email` should look like `iv:tag:ciphertext`.
    *   `emailHash` should be a hex string.
2.  **Check Login**: Try logging in with a migrated user.
3.  **Check Duplicate**: Try registering the same email again (should fail).
