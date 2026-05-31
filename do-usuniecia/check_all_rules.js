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

    const collections = ['WORKFLOW_workspaces', 'WORKFLOW_workspace_members', 'WORKFLOW_processes', 'WORKFLOW_process_groups'];

    for (let c of collections) {
        const collRes = await fetch(`${PB_URL}/api/collections/${c}`, {
            headers: { 'Authorization': token }
        });
        const coll = await collRes.json();
        console.log(`\n=== ${c} ===`);
        console.log("List:", coll.listRule);
        console.log("View:", coll.viewRule);
        console.log("Create:", coll.createRule);
        console.log("Update:", coll.updateRule);
        console.log("Delete:", coll.deleteRule);
    }
}
main();
