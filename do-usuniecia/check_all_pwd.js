const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();
    const headers = { 'Authorization': token };

    // Check ALL processes for any with password set
    console.log('=== ALL processes — checking for any set passwords ===\n');
    const res = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?perPage=100&fields=id,name,isPublic,publicPassword`, { headers });
    const data = await res.json();
    
    for (const proc of data.items) {
        const pwd = proc.publicPassword || '';
        const marker = pwd ? '🔑' : '  ';
        console.log(`${marker} "${proc.name}" (${proc.id}) | isPublic=${proc.isPublic} | password=${pwd ? `"${pwd}" (${pwd.length} chars)` : '(empty)'}`);
    }

    // Also check user tier
    console.log('\n=== User dwachalowicz@gmail.com tier ===');
    const userRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users/records?filter=email='dwachalowicz@gmail.com'&fields=id,email,tier,tier_expires_at`, { headers });
    const userData = await userRes.json();
    for (const u of userData.items) {
        console.log(`  ${u.email}: tier=${u.tier}, expires=${u.tier_expires_at}`);
    }
}

main().catch(err => console.error('Error:', err));
