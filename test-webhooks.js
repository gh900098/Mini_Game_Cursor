const axios = require('axios');
const crypto = require('crypto');
const { Client } = require('pg');

async function sendDeposit(referenceId, amount) {
    const payload = {
        memberId: 'dev_user_1',
        amount: amount,
        type: 'deposit',
        referenceId: referenceId,
        timestamp: Date.now()
    };

    // Calculate signature using the apiSecret from Company settings
    // Default testing apiSecret might be 'test_secret', double check DB later
    const secret = 'test_secret';
    const signature = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

    try {
        const response = await axios.post('http://localhost:3100/api/webhooks/sync/deposit/0ec2976d-7faf-4dd4-b2e7-5f40383c2e3a', payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature
            }
        });
        console.log(`Success ${referenceId}:`, response.data);
    } catch (err) {
        console.error(`Failed ${referenceId}:`, err.response?.data?.message || err.message);
    }
}

async function runner() {
    const client = new Client({
        user: 'postgres',
        host: 'localhost',
        database: 'minigame',
        password: 'postgres_password',
        port: 5432,
    });
    await client.connect();

    // Inject test limits
    await client.query(`
        UPDATE companies 
        SET integration_config = jsonb_set(integration_config, '{syncConfigs,deposit}', '{"enabled": true, "syncMode": "incremental", "maxPages": 200, "depositConversionRate": 10, "maxPointsPerDay": 400, "maxEligibleDeposits": 4}')
        WHERE slug = 'demo';
    `);

    console.log("Limits injected, testing deposit barrage...");

    // Barrage
    await sendDeposit('test_dep_001', 10); // 100 points
    await sendDeposit('test_dep_002', 20); // 200 points (total 300)
    await sendDeposit('test_dep_003', 15); // 150 points -> hits 400 limit, gives 100
    await sendDeposit('test_dep_004', 50); // Gives 0
    await sendDeposit('test_dep_005', 10); // Gives 0

    await client.end();
}

runner();
