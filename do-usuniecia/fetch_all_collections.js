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

    const collectionsRes = await fetch(`${PB_URL}/api/collections?perPage=100`, {
        headers: { 'Authorization': token }
    });
    
    if (!collectionsRes.ok) {
        console.error('FAILED to fetch collections:', await collectionsRes.text());
        return;
    }
    
    const data = await collectionsRes.json();
    const collections = data.items;
    
    let output = '';
    for (const collection of collections) {
        output += `\n=== Collection: ${collection.name} (${collection.type}) ===\n`;
        output += `listRule: ${collection.listRule}\n`;
        output += `viewRule: ${collection.viewRule}\n`;
        output += `createRule: ${collection.createRule}\n`;
        output += `updateRule: ${collection.updateRule}\n`;
        output += `deleteRule: ${collection.deleteRule}\n`;
        
        output += `Fields:\n`;
        for (const field of collection.fields || []) {
            output += ` - ${field.name} (${field.type}) [required: ${field.required}, unique: ${field.unique}]\n`;
        }
    }
    fs.writeFileSync('d:\\GRYF AI\\WORKFLOW\\do-usuniecia\\collections_output.json', JSON.stringify(collections, null, 2), 'utf-8');
    fs.writeFileSync('d:\\GRYF AI\\WORKFLOW\\do-usuniecia\\collections_output_utf8.txt', output, 'utf-8');
}

main().catch(err => console.error('Fatal error:', err));
