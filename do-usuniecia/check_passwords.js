/**
 * Check how publicPassword is stored in the database.
 * Admin API can read hidden fields.
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
    const headers = { 'Authorization': token };

    // Fetch ALL processes with publicPassword field
    console.log('=== ALL processes — publicPassword values ===\n');
    
    const res = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?perPage=100&fields=id,name,isPublic,publicPassword`, { headers });
    const data = await res.json();
    
    for (const proc of data.items) {
        const pwd = proc.publicPassword;
        const pwdDisplay = pwd ? `"${pwd}" (length: ${pwd.length})` : '(empty)';
        const isHash = pwd && /^[a-f0-9]{64}$/i.test(pwd);
        
        console.log(`Process: "${proc.name}" (${proc.id})`);
        console.log(`  isPublic: ${proc.isPublic}`);
        console.log(`  publicPassword: ${pwdDisplay}`);
        console.log(`  Is SHA-256 hash? ${isHash ? 'YES ✅' : pwd ? '⚠️ NO — plain text!' : 'N/A (no password)'}`);
        console.log('');
    }
    
    console.log('=== Summary ===');
    const withPwd = data.items.filter(p => p.publicPassword);
    const hashed = withPwd.filter(p => /^[a-f0-9]{64}$/i.test(p.publicPassword));
    const plaintext = withPwd.filter(p => !/^[a-f0-9]{64}$/i.test(p.publicPassword));
    
    console.log(`Total processes: ${data.items.length}`);
    console.log(`With password: ${withPwd.length}`);
    console.log(`  Properly hashed (SHA-256): ${hashed.length}`);
    console.log(`  ⚠️ Plain text: ${plaintext.length}`);
    
    if (plaintext.length > 0) {
        console.log('\n⚠️ PLAIN TEXT PASSWORDS FOUND:');
        for (const p of plaintext) {
            console.log(`  - "${p.name}" (${p.id}): "${p.publicPassword}"`);
        }
    }
}

main().catch(err => console.error('Error:', err));
