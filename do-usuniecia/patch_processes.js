import fs from 'fs';

const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    let authData;
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
        const superRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!superRes.ok) {
            console.error('FAILED to auth:', await superRes.text());
            return;
        }
        authData = await superRes.json();
    } else {
        authData = await authRes.json();
    }
    
    const token = authData.token;

    // PATCH WORKFLOW_processes
    console.log("Patching WORKFLOW_processes deleteRule...");
    const adminOnlyRule = "@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')";
    
    const procRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            deleteRule: adminOnlyRule
        })
    });

    if (procRes.ok) {
        console.log("WORKFLOW_processes deleteRule patched successfully.");
    } else {
        console.error("Failed to patch WORKFLOW_processes:", await procRes.text());
    }
}

main().catch(err => console.error('Fatal error:', err));
