const API_URL = 'http://localhost:3100/api';

async function verify() {
    try {
        // 1. Login as Admin to get a member token (Impersonation)
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

        // 2. Get a Member
        const membersRes = await fetch(`${API_URL}/admin/members`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const membersData = await membersRes.json();
        const targetMember = (membersData.items || membersData)[0];
        console.log(`Target member: ${targetMember.username} (${targetMember.id})`);

        // 3. Get Impersonation Token
        const imperRes = await fetch(`${API_URL}/admin/members/${targetMember.id}/impersonate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const imperData = await imperRes.json();
        const memberToken = imperData.token;
        console.log('Member Token received.');

        // 4. Test /members/profile using Member Token
        console.log('Fetching Member Profile...');
        const profileRes = await fetch(`${API_URL}/members/profile`, {
            headers: { Authorization: `Bearer ${memberToken}` }
        });

        if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);

        const profile = await profileRes.json();
        console.log('Profile fetched successfully:', profile.username);

        if (profile.username === targetMember.username) {
            console.log('SUCCESS: Profile matches target member.');
        } else {
            console.error('FAILURE: Profile username mismatch.');
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

verify();
