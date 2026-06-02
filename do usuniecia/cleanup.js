import PocketBase from 'pocketbase';
const pb = new PocketBase('https://pb.gryf.ai');

async function cleanupTestAccounts() {
    try {
        console.log('Authenticating as admin...');
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
        
        console.log('Fetching test accounts...');
        const records = await pb.collection('WORKFLOW_users').getFullList({
            filter: 'email ~ "@test.com"',
        });

        const testRecords = records.filter(r => r.email.startsWith('owner') || r.email.startsWith('invited'));

        console.log(`Found ${testRecords.length} test accounts to delete.`);

        for (const record of testRecords) {
            console.log(`\nProcessing ${record.email} (ID: ${record.id})...`);
            try {
                // Re-authenticate as admin for each user in case the auth store changes
                await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
                
                const tempPassword = 'DeletePassword123!';
                await pb.collection('WORKFLOW_users').update(record.id, {
                    password: tempPassword,
                    passwordConfirm: tempPassword
                });
                
                await pb.collection('WORKFLOW_users').authWithPassword(record.email, tempPassword);
                
                const res = await pb.send('/api/ai/delete-account', {
                    method: 'POST'
                });
                
                console.log(`Deleted ${record.email}`);
            } catch (innerErr) {
                console.error(`Failed to delete ${record.email}:`, innerErr.message);
            }
        }
        
        console.log('\nCleanup finished!');
        
    } catch (err) {
        console.error('Error:', err.message);
    }
}

cleanupTestAccounts();
