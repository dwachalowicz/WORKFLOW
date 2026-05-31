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

    // PATCH WORKFLOW_users
    console.log("Patching WORKFLOW_users...");
    const usersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            viewRule: "id = @request.auth.id"
        })
    });
    if (usersRes.ok) {
        console.log("WORKFLOW_users patched successfully.");
    } else {
        console.error("Failed to patch WORKFLOW_users:", await usersRes.text());
    }

    // PATCH WORKFLOW_workspace_members
    console.log("Patching WORKFLOW_workspace_members...");
    const adminOrOwnerCondition = "@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin')";
    
    const membersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_workspace_members`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            createRule: adminOrOwnerCondition,
            updateRule: adminOrOwnerCondition + " || user = @request.auth.id",
            deleteRule: adminOrOwnerCondition + " || user = @request.auth.id"
        })
    });

    if (membersRes.ok) {
        console.log("WORKFLOW_workspace_members patched successfully.");
    } else {
        console.error("Failed to patch WORKFLOW_workspace_members:", await membersRes.text());
    }
}

main().catch(err => console.error('Fatal error:', err));
