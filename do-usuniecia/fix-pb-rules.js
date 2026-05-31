import fs from 'fs';

async function fixPocketBaseRules() {
  const pbUrl = 'https://pb.gryf.ai';
  const email = 'admin@admin.pl';
  const password = '1234567890';

  try {
    console.log('1. Authenticating...');
    let authRes = await fetch(`${pbUrl}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password })
    });

    if (!authRes.ok) {
       authRes = await fetch(`${pbUrl}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
    }

    if (!authRes.ok) {
      throw new Error(`Auth failed: ${authRes.status} ${authRes.statusText}`);
    }

    const authData = await authRes.json();
    const token = authData.token;
    console.log('Successfully authenticated as admin.');

    const headers = {
      'Authorization': token,
      'Content-Type': 'application/json'
    };

    // --- FIX WORKFLOW_workspace_members ---
    console.log('2. Fixing WORKFLOW_workspace_members...');
    const wmRes = await fetch(`${pbUrl}/api/collections/WORKFLOW_workspace_members`, { headers });
    const wmCol = await wmRes.json();
    
    // Zmieniamy tylko Update Rule, zachowując obecną logikę właściciela/admina, ale doklejając zabezpieczenia dla zwykłego usera
    const newWmUpdateRule = `@collection.WORKFLOW_workspaces.id ?= workspace && (@collection.WORKFLOW_workspaces.owner ?= @request.auth.id || @collection.WORKFLOW_workspace_members.workspace ?= workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= 'active' && @collection.WORKFLOW_workspace_members.role ?= 'admin') || (user = @request.auth.id && @request.data.role:isset = false && @request.data.workspace:isset = false && @request.data.user:isset = false)`;

    const wmUpdateRes = await fetch(`${pbUrl}/api/collections/WORKFLOW_workspace_members`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ updateRule: newWmUpdateRule })
    });

    if (wmUpdateRes.ok) {
      console.log('✅ WORKFLOW_workspace_members updated successfully.');
    } else {
      console.error('❌ Failed to update WORKFLOW_workspace_members:', await wmUpdateRes.text());
    }


    // --- FIX WORKFLOW_notifications ---
    console.log('3. Fixing WORKFLOW_notifications...');
    const notifRes = await fetch(`${pbUrl}/api/collections/WORKFLOW_notifications`, { headers });
    const notifCol = await notifRes.json();
    
    // Zmieniamy Update Rule, aby user mógł modyfikować tylko isRead itp., a nie treść wiadomości
    const newNotifUpdateRule = `user = @request.auth.id && @request.data.message:isset = false && @request.data.title:isset = false && @request.data.type:isset = false && @request.data.user:isset = false`;

    const notifUpdateRes = await fetch(`${pbUrl}/api/collections/WORKFLOW_notifications`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ updateRule: newNotifUpdateRule })
    });

    if (notifUpdateRes.ok) {
      console.log('✅ WORKFLOW_notifications updated successfully.');
    } else {
      console.error('❌ Failed to update WORKFLOW_notifications:', await notifUpdateRes.text());
    }

    console.log('\nAll done!');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fixPocketBaseRules();
