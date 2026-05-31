import PocketBase from 'pocketbase';
import fs from 'fs';

async function run() {
    const pb = new PocketBase('https://pb.gryf.ai');
    try {
        await pb.collection('WORKFLOW_users').authWithPassword('admin@admin.pl', '1234567890');
        console.log('Auth successful as WORKFLOW_users!');
        
        // Since we are not admin, we might not be able to fetch full rules, but let's try reading collections
        const collections = await pb.collections.getList();
        console.log(collections);
    } catch (e) {
        console.log('Auth failed', e.message);
    }
}
run().catch(console.error);
