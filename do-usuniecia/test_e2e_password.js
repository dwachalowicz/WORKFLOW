const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';
const PROCESS_ID = '2dk63st2txjzbow';

async function main() {
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };

    console.log('=== END-TO-END PASSWORD FLOW TEST ===\n');

    // Step 1: Set password via new endpoint
    console.log('Step 1: Set password "haselko" via /api/process/set-password');
    const setRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID, password: 'haselko' })
    });
    console.log(`  Status: ${setRes.status} | ${JSON.stringify(await setRes.json())}`);

    // Step 2: Check has-password
    console.log('\nStep 2: Check has-password');
    const hasRes = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    const hasData = await hasRes.json();
    console.log(`  hasPassword=${hasData.hasPassword} (expected: true)`);

    // Step 3: Try shared verify with WRONG password
    console.log('\nStep 3: Verify with WRONG password');
    const wrongRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID, password: 'wrongpassword' })
    });
    console.log(`  Status: ${wrongRes.status} (expected: 401)`);

    // Step 4: Try shared verify with CORRECT password
    console.log('\nStep 4: Verify with CORRECT password "haselko"');
    const correctRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID, password: 'haselko' })
    });
    const correctData = await correctRes.json();
    console.log(`  Status: ${correctRes.status} (expected: 200)`);
    console.log(`  Got process name: "${correctData.name}"`);

    // Step 5: Clear password
    console.log('\nStep 5: Clear password');
    const clearRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID, password: '' })
    });
    console.log(`  Status: ${clearRes.status} | ${JSON.stringify(await clearRes.json())}`);

    // Step 6: Verify password cleared
    console.log('\nStep 6: Verify password cleared');
    const has2Res = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    const has2Data = await has2Res.json();
    console.log(`  hasPassword=${has2Data.hasPassword} (expected: false)`);

    // Step 7: Shared verify without password (should work — no password set)
    console.log('\nStep 7: Access shared process (no password needed now)');
    const openRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    console.log(`  Status: ${openRes.status} (expected: 200)`);
    const openData = await openRes.json();
    console.log(`  Got process name: "${openData.name}"`);

    console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(err => console.error('Error:', err));
