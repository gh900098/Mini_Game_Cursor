const API_URL = 'http://localhost:3100/api';

async function verify() {
    try {
        // 1. Login as Admin
        console.log('Logging in as Admin...');
        const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'demo@company.com', password: 'Demo@12345' })
        });

        if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${adminLoginRes.status}`);
        const adminData = await adminLoginRes.json();
        const adminToken = adminData.access_token;
        console.log('Admin logged in.');

        // 2. Get Members
        console.log('Fetching members...');
        const membersRes = await fetch(`${API_URL}/admin/members`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!membersRes.ok) throw new Error(`Get members failed: ${membersRes.status}`);
        const membersData = await membersRes.json();
        const members = membersData.items || membersData;

        if (!members || members.length === 0) {
            console.error('No members found.');
            return;
        }

        const targetMember = members[0];
        console.log(`Target member: ${targetMember.username} (${targetMember.id})`);

        // 3. Request Impersonation
        console.log('Requesting impersonation token...');
        const imperRes = await fetch(`${API_URL}/admin/members/${targetMember.id}/impersonate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        if (!imperRes.ok) throw new Error(`Impersonate failed: ${imperRes.status}`);

        const imperData = await imperRes.json();
        console.log('Impersonate Response:', imperData);

        if (imperData.token && imperData.redirectUrl) {
            console.log('SUCCESS: Token and Redirect URL received.');
            console.log(`Magic Link: ${imperData.redirectUrl}?token=${imperData.token}`);
        } else {
            console.error('FAILURE: Missing token or redirectUrl');
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verify();
