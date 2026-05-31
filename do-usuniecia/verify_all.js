const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';
const USER_EMAIL = 'dwachalowicz@gmail.com';

async function main() {
    // Auth as admin first to find user password
    const adminAuth = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token: adminToken } = await adminAuth.json();

    console.log('=== COMPREHENSIVE POST-RESTART VERIFICATION ===\n');

    // 1. Test has-password endpoint (no auth required)
    console.log('1. Testing has-password (no auth):');
    const hasRes = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow' })
    });
    const hasData = await hasRes.json();
    console.log(`   Status: ${hasRes.status} | Result: ${JSON.stringify(hasData)}`);

    // 2. Test set-password as admin (superuser) - should work since admin has full access
    console.log('\n2. Testing set-password as superuser:');
    const setRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow', password: 'haselko' })
    });
    const setData = await setRes.json();
    console.log(`   Status: ${setRes.status} | Result: ${JSON.stringify(setData)}`);

    // 3. Verify password is in DB
    console.log('\n3. Checking DB for password:');
    const procRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/2dk63st2txjzbow?fields=publicPassword,isPublic`, {
        headers: { 'Authorization': adminToken }
    });
    const proc = await procRes.json();
    console.log(`   isPublic: ${proc.isPublic} | publicPassword: ${proc.publicPassword ? `hash (${proc.publicPassword.length} chars)` : '(empty)'}`);

    // 4. Verify has-password detects it
    console.log('\n4. has-password after setting:');
    const has2Res = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow' })
    });
    const has2Data = await has2Res.json();
    console.log(`   Result: ${JSON.stringify(has2Data)}`);

    // 5. Test existing endpoints still work
    console.log('\n5. Testing existing endpoints:');
    
    // 5a. folder-stats (with auth)
    const folderRes = await fetch(`${PB_URL}/api/folder-stats/NOT_A_REAL_ID`, {
        headers: { 'Authorization': adminToken }
    });
    console.log(`   folder-stats (bad ID): ${folderRes.status}`);

    // 5b. delete-account endpoint namespace change
    const delRes = await fetch(`${PB_URL}/api/account/delete`, {
        method: 'POST',
        headers: { 'Authorization': adminToken }
    });
    console.log(`   /api/account/delete: ${delRes.status} (should NOT be 404)`);

    // 5c. OLD delete-account should be 404
    const oldDelRes = await fetch(`${PB_URL}/api/ai/delete-account`, {
        method: 'POST',
        headers: { 'Authorization': adminToken }
    });
    console.log(`   /api/ai/delete-account (OLD): ${oldDelRes.status} (should be 404)`);

    // 5d. debug_limits should be gone
    const debugRes = await fetch(`${PB_URL}/api/locked-processes/debug_limits`, {
        headers: { 'Authorization': adminToken }
    });
    console.log(`   debug_limits: ${debugRes.status} (should NOT return debug data)`);
    const debugData = await debugRes.json();
    const isDebugGone = !debugData.tierLimits;
    console.log(`   debug_limits data leak removed: ${isDebugGone ? '✅' : '❌ STILL LEAKING'}`);

    // 6. Test shared process endpoint still works
    console.log('\n6. Testing shared process endpoint:');
    const sharedRes = await fetch(`${PB_URL}/api/shared/process/2dk63st2txjzbow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'haselko' })
    });
    console.log(`   shared/process with password: ${sharedRes.status}`);
    const sharedData = await sharedRes.json();
    console.log(`   Got process data: ${sharedData.name ? '✅ "' + sharedData.name + '"' : '❌ ' + JSON.stringify(sharedData)}`);

    // 7. Test lock endpoint still works
    console.log('\n7. Testing lock endpoint:');
    const lockRes = await fetch(`${PB_URL}/api/process/lock`, {
        method: 'POST',
        headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow' })
    });
    console.log(`   lock: ${lockRes.status}`);

    // 8. Clean up - clear password and unlock
    await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: '2dk63st2txjzbow', password: '' })
    });
    await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/2dk63st2txjzbow`, {
        method: 'PATCH',
        headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ locked_by: null, locked_at: null })
    });
    console.log('\n8. Cleanup done (password cleared, lock released)');

    // 9. Test globalThis helpers work (check AI proxy endpoint which uses getEffectiveTier, getEncryptionKey)
    console.log('\n9. Testing AI proxy (uses getEffectiveTier + getEncryptionKey):');
    const aiRes = await fetch(`${PB_URL}/api/ai/proxy`, {
        method: 'POST',
        headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: 'test', messages: [] })
    });
    console.log(`   AI proxy status: ${aiRes.status} (non-500 means helpers work)`);

    console.log('\n=== VERIFICATION COMPLETE ===');
}

main().catch(err => console.error('Error:', err));
