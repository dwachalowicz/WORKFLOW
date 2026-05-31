const PB_URL = 'https://pb.gryf.ai';

async function main() {
    // 1. First test basic connectivity
    console.log('1. Testing PocketBase connectivity...');
    const healthRes = await fetch(`${PB_URL}/api/health`);
    console.log(`   Health: ${healthRes.status} - ${await healthRes.text()}`);

    // 2. Auth as admin (superuser)
    console.log('\n2. Auth as admin...');
    const adminAuth = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'admin@admin.pl', password: '1234567890' })
    });
    const adminData = await adminAuth.json();
    if (!adminData.token) {
        console.log(`   Admin auth failed: ${JSON.stringify(adminData)}`);
        return;
    }
    console.log('   Admin auth OK');
    const adminHeaders = { 'Authorization': adminData.token, 'Content-Type': 'application/json' };

    // 3. Find the test user and their workspace
    console.log('\n3. Finding user dwachalowicz@gmail.com...');
    const usersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users/records?filter=email='dwachalowicz@gmail.com'&fields=id,name,email`, {
        headers: adminHeaders
    });
    const usersData = await usersRes.json();
    const user = usersData.items?.[0];
    console.log(`   Found: ${user?.name} (${user?.id})`);

    // 4. Find their workspaces
    console.log('\n4. Finding workspaces...');
    const wsRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspaces/records?filter=owner='${user.id}'&fields=id,name`, {
        headers: adminHeaders
    });
    const wsData = await wsRes.json();
    console.log(`   Workspaces: ${wsData.items?.map(w => `${w.name} (${w.id})`).join(', ')}`);

    // 5. Find processes
    console.log('\n5. Finding processes in first workspace...');
    const firstWs = wsData.items?.[0];
    if (!firstWs) { console.log('   No workspace found'); return; }
    const procRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?filter=workspace='${firstWs.id}'&fields=id,name,isPublic&perPage=5`, {
        headers: adminHeaders
    });
    const procData = await procRes.json();
    procData.items?.forEach(p => console.log(`   - ${p.name} (${p.id}) isPublic=${p.isPublic}`));

    // 6. Test set-password directly via admin (bypass endpoint, set DB directly)
    const testProc = procData.items?.find(p => p.isPublic) || procData.items?.[0];
    if (!testProc) { console.log('   No process found'); return; }
    console.log(`\n6. Testing password endpoints on "${testProc.name}" (${testProc.id})...`);

    // 6a. has-password (no auth needed)
    const hasRes = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: testProc.id })
    });
    console.log(`   has-password: ${hasRes.status} - ${await hasRes.text()}`);

    // 6b. set-password as admin (test superuser bypass) 
    const setRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ processId: testProc.id, password: 'testhaslo' })
    });
    console.log(`   set-password (admin): ${setRes.status} - ${await setRes.text()}`);

    // 6c. Check password in DB
    const dbRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${testProc.id}?fields=publicPassword`, {
        headers: adminHeaders
    });
    const dbData = await dbRes.json();
    console.log(`   DB publicPassword: ${dbData.publicPassword ? `"${dbData.publicPassword.substring(0,20)}..." (${dbData.publicPassword.length} chars)` : '(empty)'}`);

    // 6d. has-password after set
    const has2Res = await fetch(`${PB_URL}/api/process/has-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: testProc.id })
    });
    console.log(`   has-password after set: ${await has2Res.text()}`);

    // 6e. Verify correct password
    if (testProc.isPublic) {
        const verifyRes = await fetch(`${PB_URL}/api/shared/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: testProc.id, password: 'testhaslo' })
        });
        console.log(`   shared/verify correct pwd: ${verifyRes.status}`);

        const wrongRes = await fetch(`${PB_URL}/api/shared/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processId: testProc.id, password: 'wrong' })
        });
        console.log(`   shared/verify wrong pwd: ${wrongRes.status} (expected 401)`);
    }

    // 6f. Clear password
    const clearRes = await fetch(`${PB_URL}/api/process/set-password`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ processId: testProc.id, password: '' })
    });
    console.log(`   clear password: ${clearRes.status} - ${await clearRes.text()}`);

    // 7. Test other endpoints
    console.log('\n7. Testing other endpoints...');
    
    const delRes = await fetch(`${PB_URL}/api/account/delete`, {
        method: 'POST', headers: adminHeaders
    });
    console.log(`   /api/account/delete: ${delRes.status} (should NOT be 404)`);

    const oldDelRes = await fetch(`${PB_URL}/api/ai/delete-account`, {
        method: 'POST', headers: adminHeaders
    });
    console.log(`   /api/ai/delete-account (OLD): ${oldDelRes.status} (should be 404)`);

    const chatRes = await fetch(`${PB_URL}/api/ai/chat`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({})
    });
    console.log(`   /api/ai/chat: ${chatRes.status} (should not be 404 or 500)`);

    const lockRes = await fetch(`${PB_URL}/api/process/lock`, {
        method: 'POST', headers: adminHeaders,
        body: JSON.stringify({ processId: testProc.id })
    });
    console.log(`   /api/process/lock: ${lockRes.status}`);

    // Unlock
    await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${testProc.id}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ locked_by: null, locked_at: null })
    });

    console.log('\n=== ALL TESTS COMPLETE ===');
}

main().catch(err => console.error('Error:', err));
