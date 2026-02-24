const axios = require('axios');

const API_BASE = 'http://localhost:3100/api';
const ADMIN_EMAIL = 'super@admin.com';
const ADMIN_PASSWORD = 'Demo@12345';

async function verifyProtection() {
    try {
        console.log('--- Impersonation Protection Verification ---');

        // 1. Admin Login
        console.log('Logging in as Admin...');
        const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
        });
        const adminToken = adminLogin.data.access_token;
        console.log('Admin logged in.');

        // 2. Get Game Instances
        const instanceResp = await axios.get(`${API_BASE}/game-instances`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const companyInstance = instanceResp.data.find(i => i.slug === 'christmas-spin') || instanceResp.data[0];
        if (!companyInstance) {
            throw new Error('FAILED: No game instances found in the system');
        }
        console.log(`Using instance: ${companyInstance.slug} (${companyInstance.id})`);

        // 3. Find or create a member in that same company
        const membersResp = await axios.get(`${API_BASE}/admin/members`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        let targetMember = membersResp.data.items.find(m => m.companyId === companyInstance.companyId);

        if (!targetMember) {
            console.log(`No member found for company ${companyInstance.companyId}. Creating a test member...`);
            const newMember = await axios.post(`${API_BASE}/admin/members`, {
                username: `test_impersonator_${Date.now()}`,
                externalId: `ext_${Date.now()}`,
                companyId: companyInstance.companyId,
                pointsBalance: 0
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            targetMember = newMember.data;
            console.log(`Created test member: ${targetMember.username} (${targetMember.id})`);
        } else {
            console.log(`Using existing member: ${targetMember.username} (${targetMember.id})`);
        }
        console.log(`Member Company ID: ${targetMember.companyId}`);
        console.log(`Initial Balance: ${targetMember.pointsBalance}`);

        // 4. Impersonate
        console.log('Impersonating member...');
        const impersonate = await axios.post(`${API_BASE}/admin/members/${targetMember.id}/impersonate`, {}, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const memberToken = impersonate.data.token;
        console.log('Member token received.');

        // 5. Check Current Status (Bypass Test)
        console.log(`Checking Player Status (${companyInstance.slug})...`);
        const status = await axios.get(`${API_BASE}/scores/status/${companyInstance.slug}`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log(`Status isImpersonated: ${status.data.isImpersonated}`);
        if (!status.data.isImpersonated) {
            throw new Error('FAILED: isImpersonated flag missing in status response');
        }

        // 6. Submit Score (Persistence/Deduction Test)
        console.log(`Submitting Score (1000 points) to ${companyInstance.slug}...`);
        const submit = await axios.post(`${API_BASE}/scores/${companyInstance.slug}`, {
            score: 1000,
            metadata: { prizeIndex: 1 }
        }, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log('Score submission response:', submit.data.id === 'impersonated-test-id' ? 'MOCK ID RECEIVED' : 'REAL ID RECEIVED');

        if (submit.data.id !== 'impersonated-test-id') {
            throw new Error('FAILED: Persistence bypass failed. Received a real score ID.');
        }

        // 6. Verify Balance Unchanged
        console.log('Verifying balance remains unchanged...');
        const profile = await axios.get(`${API_BASE}/members/profile`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        console.log(`New Balance: ${profile.data.pointsBalance}`);
        if (profile.data.pointsBalance !== targetMember.pointsBalance) {
            throw new Error(`FAILED: Balance changed! ${targetMember.pointsBalance} -> ${profile.data.pointsBalance}`);
        }

        // 7. Verify History Empty (for this attempt)
        console.log('Verifying score not in history...');
        const history = await axios.get(`${API_BASE}/scores/my-scores`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });
        const found = history.data.find(s => s.score === 1000);
        if (found) {
            throw new Error('FAILED: Score was found in member history!');
        }

        console.log('\nSUCCESS: Impersonation protection is working strictly.');
        console.log('- [x] Rules Bypassed (via isImpersonated flag)');
        console.log('- [x] No Persistence (Mock ID returned)');
        console.log('- [x] No Token Deduction');
        console.log('- [x] No History Pollution');

    } catch (error) {
        console.error('\nVerification FAILED:');
        if (error.response) {
            console.error(error.response.status, error.response.data);
        } else {
            console.error(error.message);
        }
        process.exit(1);
    }
}

verifyProtection();
