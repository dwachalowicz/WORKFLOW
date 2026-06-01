import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pb.gryf.ai');

async function test() {
    try {
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        
        // 1. Create owner
        const ownerEmail = `owner2_${Date.now()}@test.com`;
        const owner = await pb.collection('WORKFLOW_users').create({
            email: ownerEmail,
            password: 'password123',
            passwordConfirm: 'password123',
            name: 'Test Owner'
        });
        
        await pb.collection('WORKFLOW_users').authWithPassword(ownerEmail, 'password123');
        const newWs = await pb.collection('WORKFLOW_workspaces').create({
            name: 'Test Workspace',
            owner: owner.id
        });

        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        const invitedEmail = `invited2_${Date.now()}@test.com`;
        const invitedUser = await pb.collection('WORKFLOW_users').create({
            email: invitedEmail,
            password: 'password123',
            passwordConfirm: 'password123',
            name: 'Test Invited'
        });

        await pb.collection('WORKFLOW_users').authWithPassword(ownerEmail, 'password123');

        // Create with full fetch to see raw response
        const res = await fetch('https://pb.gryf.ai/api/collections/WORKFLOW_workspace_members/records', {
            method: 'POST',
            headers: {
                'Authorization': pb.authStore.token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workspace: newWs.id,
                user: invitedUser.id,
                role: 'editor',
                status: 'pending'
            })
        });

        console.log('Status:', res.status, res.statusText);
        const text = await res.text();
        console.log('Response body:', text);

    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
