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

    console.log('=== Testing new set-password endpoint ===\n');

    // 1. Test set-password endpoint
    const setRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow', password: 'testpassword123' })
    });
    const setData = await setRes.json();
    console.log('Set password result:', JSON.stringify(setData));

    // 2. Test has-password endpoint  
    const hasRes = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow' })
    });
    const hasData = await hasRes.json();
    console.log('Has password result:', JSON.stringify(hasData));

    // 3. Verify in DB
    const procRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/2dk63st2txjzbow?fields=publicPassword`, { headers });
    const proc = await procRes.json();
    console.log('DB publicPassword:', proc.publicPassword ? `"${proc.publicPassword.substring(0,30)}..." (${proc.publicPassword.length} chars)` : '(empty)');

    // 4. Test clear password
    const clearRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow', password: '' })
    });
    const clearData = await clearRes.json();
    console.log('\nClear password result:', JSON.stringify(clearData));

    // 5. Verify cleared
    const has2Res = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow' })
    });
    const has2Data = await has2Res.json();
    console.log('Has password after clear:', JSON.stringify(has2Data));
}

main().catch(err => console.error('Error:', err));
