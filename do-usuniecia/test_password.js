/**
 * Test: Set password "MALYKOT" on a process and check how it's stored.
 */
const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    // Auth
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();
    const headers = { 'Authorization': token, 'Content-Type': 'application/json' };

    // Pick first process
    const listRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?perPage=1&fields=id,name,publicPassword`, { headers });
    const listData = await listRes.json();
    const proc = listData.items[0];
    
    console.log(`=== TEST: Setting password "MALYKOT" on process "${proc.name}" (${proc.id}) ===\n`);
    console.log(`BEFORE update:`);
    console.log(`  publicPassword: "${proc.publicPassword || '(empty)'}"\n`);
    
    // Set password
    const updateRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${proc.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ publicPassword: 'MALYKOT' })
    });
    
    if (!updateRes.ok) {
        console.log('Update failed:', await updateRes.text());
        return;
    }
    
    // Read back what's stored
    const readRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${proc.id}?fields=id,name,publicPassword`, { headers });
    const updated = await readRes.json();
    
    console.log(`AFTER update (what's stored in DB):`);
    console.log(`  publicPassword: "${updated.publicPassword}"`);
    console.log(`  Length: ${updated.publicPassword.length} chars`);
    console.log(`  Is SHA-256 hash (64-char hex)? ${/^[a-f0-9]{64}$/i.test(updated.publicPassword) ? 'YES ✅ — properly hashed!' : '⚠️ NO — stored as plain text or other format!'}`);
    console.log(`  Original "MALYKOT" visible? ${updated.publicPassword === 'MALYKOT' ? '⚠️ YES — PLAIN TEXT!' : 'NO ✅ — not readable'}`);
    
    // Now clean up — remove the test password
    console.log(`\n--- Cleaning up: removing test password ---`);
    await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/${proc.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ publicPassword: '' })
    });
    console.log('Cleaned up ✅');
}

main().catch(err => console.error('Error:', err));
