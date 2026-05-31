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

    // fetch a process
    const procRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?perPage=1`, {
        headers: { 'Authorization': token }
    });
    const procData = await procRes.json();
    if (procData.items.length === 0) {
        console.log("No processes found to delete.");
        return;
    }
    const procId = procData.items[0].id;
    console.log("Deleting process " + procId + " (" + procData.items[0].name + ")...");

    const delRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${procId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token }
    });
    
    if (delRes.ok) {
        console.log("Deleted successfully.");
    } else {
        const err = await delRes.text();
        console.log("Delete failed:", delRes.status, err);
    }
}
main();
