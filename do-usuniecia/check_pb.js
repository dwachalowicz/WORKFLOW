/**
 * Skrypt diagnostyczny PocketBase — sprawdza reguły kolekcji WORKFLOW_processes
 * i uprawnienia do tworzenia rekordów w udostępnionym workspace
 */
const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    console.log('=== PocketBase Diagnostics ===\n');

    // 1. Auth as admin
    console.log('1. Logowanie jako admin...');
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
        // Try superuser collection auth (PB v0.23+)
        console.log('   Admin auth failed, trying superuser collection...');
        const superRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!superRes.ok) {
            console.error('   FAILED to auth:', await superRes.text());
            return;
        }
        var authData = await superRes.json();
    } else {
        var authData = await authRes.json();
    }
    
    const token = authData.token;
    console.log('   OK - zalogowano\n');

    // 2. Get WORKFLOW_processes collection schema/rules
    console.log('2. Pobieranie reguł kolekcji WORKFLOW_processes...');
    const collectionsRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes`, {
        headers: { 'Authorization': token }
    });
    
    if (!collectionsRes.ok) {
        console.error('   FAILED:', await collectionsRes.text());
        return;
    }
    
    const collection = await collectionsRes.json();
    console.log('   Collection ID:', collection.id);
    console.log('   Collection Name:', collection.name);
    console.log('   Collection Type:', collection.type);
    console.log('\n   === API RULES ===');
    console.log('   listRule:', JSON.stringify(collection.listRule));
    console.log('   viewRule:', JSON.stringify(collection.viewRule));
    console.log('   createRule:', JSON.stringify(collection.createRule));
    console.log('   updateRule:', JSON.stringify(collection.updateRule));
    console.log('   deleteRule:', JSON.stringify(collection.deleteRule));
    
    // 3. Get WORKFLOW_workspaces collection rules
    console.log('\n3. Pobieranie reguł kolekcji WORKFLOW_workspaces...');
    const wsCollRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspaces`, {
        headers: { 'Authorization': token }
    });
    
    if (wsCollRes.ok) {
        const wsColl = await wsCollRes.json();
        console.log('   listRule:', JSON.stringify(wsColl.listRule));
        console.log('   viewRule:', JSON.stringify(wsColl.viewRule));
        console.log('   createRule:', JSON.stringify(wsColl.createRule));
        console.log('   updateRule:', JSON.stringify(wsColl.updateRule));
        console.log('   deleteRule:', JSON.stringify(wsColl.deleteRule));
    }

    // 4. Get WORKFLOW_workspace_members collection rules
    console.log('\n4. Pobieranie reguł kolekcji WORKFLOW_workspace_members...');
    const wmCollRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspace_members`, {
        headers: { 'Authorization': token }
    });
    
    if (wmCollRes.ok) {
        const wmColl = await wmCollRes.json();
        console.log('   listRule:', JSON.stringify(wmColl.listRule));
        console.log('   viewRule:', JSON.stringify(wmColl.viewRule));
        console.log('   createRule:', JSON.stringify(wmColl.createRule));
        console.log('   updateRule:', JSON.stringify(wmColl.updateRule));
        console.log('   deleteRule:', JSON.stringify(wmColl.deleteRule));
    }

    // 5. List all users with their tiers
    console.log('\n5. Użytkownicy i ich plany...');
    const usersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users/records?fields=id,email,name,username,tier,tier_expires_at&sort=-created&perPage=50`, {
        headers: { 'Authorization': token }
    });
    
    if (usersRes.ok) {
        const usersData = await usersRes.json();
        for (const u of usersData.items) {
            console.log(`   ${u.email || u.username} — tier: ${u.tier || 'FREE'} (expires: ${u.tier_expires_at || 'never'})`);
        }
    }

    // 6. List workspace memberships
    console.log('\n6. Workspace memberships (aktywne)...');
    const membersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspace_members/records?filter=status='active'&expand=user,workspace&perPage=100`, {
        headers: { 'Authorization': token }
    });
    
    if (membersRes.ok) {
        const membersData = await membersRes.json();
        for (const m of membersData.items) {
            const userName = m.expand?.user?.email || m.expand?.user?.username || m.user;
            const wsName = m.expand?.workspace?.name || m.workspace;
            const wsOwner = m.expand?.workspace?.owner || '?';
            console.log(`   ${userName} → workspace "${wsName}" (role: ${m.role}, ws owner: ${wsOwner})`);
        }
    }

    // 7. List workspaces with owners
    console.log('\n7. Workspaces...');
    const wsRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspaces/records?expand=owner&perPage=100`, {
        headers: { 'Authorization': token }
    });
    
    if (wsRes.ok) {
        const wsData = await wsRes.json();
        for (const ws of wsData.items) {
            const ownerEmail = ws.expand?.owner?.email || ws.expand?.owner?.username || ws.owner;
            const processCountRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?filter=workspace='${ws.id}'&perPage=1&fields=id`, {
                headers: { 'Authorization': token }
            });
            const processCountData = processCountRes.ok ? await processCountRes.json() : { totalItems: '?' };
            console.log(`   "${ws.name}" — owner: ${ownerEmail} — processes: ${processCountData.totalItems}`);
        }
    }

    // 8. Check tier_config
    console.log('\n8. Konfiguracja tierów (WORKFLOW_tier_config)...');
    const tierRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_tier_config/records?sort=sort_order`, {
        headers: { 'Authorization': token }
    });
    
    if (tierRes.ok) {
        const tierData = await tierRes.json();
        for (const t of tierData.items) {
            console.log(`   ${t.tier}: maxProcesses=${t.max_processes}, maxNodes=${t.max_nodes_per_process}, maxEdges=${t.max_edges_per_process}, maxMembers=${t.max_members_per_workspace}`);
        }
    }

    console.log('\n=== Diagnostics Complete ===');
}

main().catch(err => console.error('Fatal error:', err));
