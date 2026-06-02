import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pb.gryf.ai');

async function deleteUserAccount(email) {
    try {
        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        
        console.log(`Finding user ${email}...`);
        const user = await pb.collection('WORKFLOW_users').getFirstListItem(`email="${email}"`);
        
        if (!user) {
            console.error('User not found!');
            return;
        }
        
        console.log(`User found with ID: ${user.id}`);
        console.log('Updating user password to allow deletion...');
        
        const tempPassword = 'DeletePassword123!';
        await pb.collection('WORKFLOW_users').update(user.id, {
            password: tempPassword,
            passwordConfirm: tempPassword
        });
        
        console.log('Authenticating as the user...');
        await pb.collection('WORKFLOW_users').authWithPassword(email, tempPassword);
        
        console.log('Calling delete account API...');
        const res = await pb.send('/api/ai/delete-account', {
            method: 'POST'
        });
        
        console.log('Delete response:', res);
        console.log('Account deleted successfully!');
        
    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Details:', err.response);
        }
    }
}

deleteUserAccount('dwachalowicz@gmail.com');
