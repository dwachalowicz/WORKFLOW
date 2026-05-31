import PocketBase from 'pocketbase';
import fs from 'fs';

async function run() {
    const pb = new PocketBase('https://pb.gryf.ai');
    try {
        await pb.admins.authWithPassword('admin@admin.pl', '1234567890');
    } catch (e) {
        console.log('Admin auth failed, trying _superusers collection...');
        await pb.collection('_superusers').authWithPassword('admin@admin.pl', '1234567890');
    }

    console.log('Auth successful!');
    
    const collections = await pb.collections.getFullList();
    let out = '';
    for (const c of collections) {
        out += `Collection: ${c.name}\n`;
        out += `listRule: ${c.listRule}\n`;
        out += `viewRule: ${c.viewRule}\n`;
        out += `createRule: ${c.createRule}\n`;
        out += `updateRule: ${c.updateRule}\n`;
        out += `deleteRule: ${c.deleteRule}\n\n`;
    }
    fs.writeFileSync('do-usuniecia/collections-rules.txt', out);
    console.log('Done!');
}
run().catch(console.error);
