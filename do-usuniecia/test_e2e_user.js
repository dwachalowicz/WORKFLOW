const PB_URL = 'https://pb.gryf.ai';
const USER_EMAIL = 'dwachalowicz@gmail.com';
const USER_PASS = '1234567890';
const PROCESS_ID = '2dk63st2txjzbow';

async function main() {
    // Auth as regular user
    const authRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: USER_EMAIL, password: USER_PASS })
    });
    const authData = await authRes.json();
    if (!authData.token) {
        console.error('Auth failed:', JSON.stringify(authData));
        return;
    }
    const headers = { 'Authorization': authData.token, 'Content-Type': 'application/json' };
    console.log(`Authenticated as: ${authData.record?.name || authData.record?.email}`);
    console.log('=== END-TO-END PASSWORD FLOW TEST (as user) ===\n');

    // Step 1: Set password
    console.log('Step 1: Set password "haselko"');
    const setRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID, password: 'haselko' })
    });
    const setData = await setRes.json();
    console.log(`  Status: ${setRes.status} | ${JSON.stringify(setData)}`);

    // Step 2: Check has-password  
    console.log('\nStep 2: has-password');
    const hasRes = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    const hasData = await hasRes.json();
    console.log(`  Result: ${JSON.stringify(hasData)} (expected hasPassword=true)`);

    // Step 3: Wrong password via /api/shared/verify
    console.log('\nStep 3: Verify WRONG password');
    const wrongRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID, password: 'wrong' })
    });
    console.log(`  Status: ${wrongRes.status} (expected 401)`);

    // Step 4: Correct password via /api/shared/verify  
    console.log('\nStep 4: Verify CORRECT password');
    const okRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID, password: 'haselko' })
    });
    const okData = await okRes.json();
    console.log(`  Status: ${okRes.status} (expected 200)`);
    console.log(`  Got name: "${okData.name}"`);

    // Step 5: Clear password
    console.log('\nStep 5: Clear password');
    const clearRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST', headers,
        body: JSON.stringify({ processId: PROCESS_ID, password: '' })
    });
    const clearData = await clearRes.json();
    console.log(`  Status: ${clearRes.status} | ${JSON.stringify(clearData)}`);

    // Step 6: has-password after clear
    console.log('\nStep 6: has-password after clear');
    const has2Res = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    const has2Data = await has2Res.json();
    console.log(`  Result: ${JSON.stringify(has2Data)} (expected hasPassword=false)`);

    // Step 7: Access without password
    console.log('\nStep 7: Verify no-password access');
    const openRes = await fetch(`${PB_URL}/api/shared/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: PROCESS_ID })
    });
    console.log(`  Status: ${openRes.status} (expected 200)`);

    console.log('\n=== COMPLETE ===');
}

main().catch(err => console.error('Error:', err));
