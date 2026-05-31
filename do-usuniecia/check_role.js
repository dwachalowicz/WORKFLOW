/**
 * Szybki check — jaka rola ma dwachalowicz w workspace domwachalowicz
 */
const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    // Auth as superuser
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const authData = await authRes.json();
    const token = authData.token;

    // Check current membership role
    console.log('=== Membership check ===');
    const membersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspace_members/records?filter=status='active'&expand=user,workspace&perPage=100`, {
        headers: { 'Authorization': token }
    });
    const membersData = await membersRes.json();
    for (const m of membersData.items) {
        const userName = m.expand?.user?.email || m.user;
        const wsName = m.expand?.workspace?.name || m.workspace;
        const wsOwner = m.expand?.workspace?.owner || '?';
        console.log(`${userName} → ws: "${wsName}" (role: ${m.role}, status: ${m.status}, ws_owner: ${wsOwner})`);
    }

    // Check WORKFLOW_processes createRule in detail
    console.log('\n=== WORKFLOW_processes Collection Rules ===');
    const collRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes`, {
        headers: { 'Authorization': token }
    });
    const coll = await collRes.json();
    console.log('createRule:', coll.createRule);
    console.log('updateRule:', coll.updateRule);

    // Simulate: what PB sees for the create/update check
    // The rule requires: role ?= 'admin' — this excludes 'editor'!
    console.log('\n=== ANALIZA PROBLEMU ===');
    console.log('createRule wymaga: @collection.WORKFLOW_workspace_members.role ?= "admin"');
    console.log('updateRule wymaga: @collection.WORKFLOW_workspace_members.role ?= "admin"');
    console.log('');
    console.log('Edytor (editor) jest BLOKOWANY przez te reguły!');
    console.log('Trzeba zmienić reguły na: role ?= "admin" || role ?= "editor"');
}

main().catch(err => console.error('Error:', err));
