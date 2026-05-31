const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    const { token } = await authRes.json();
    const headers = { 'Authorization': token };

    // Find process "ds" 
    const res = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records?filter=name='ds'&fields=id,name,isPublic,publicPassword,owner,workspace`, { headers });
    const data = await res.json();
    
    console.log(`=== Process "ds" — password check ===\n`);
    
    for (const proc of data.items) {
        console.log(`Process: "${proc.name}" (${proc.id})`);
        console.log(`  isPublic: ${proc.isPublic}`);
        console.log(`  publicPassword: "${proc.publicPassword}"`);
        console.log(`  Length: ${proc.publicPassword?.length || 0}`);
        console.log(`  Is SHA-256 hash? ${/^[a-f0-9]{64}$/i.test(proc.publicPassword) ? 'YES ✅' : '⚠️ NO'}`);
        console.log(`  Is plain "haselko"? ${proc.publicPassword === 'haselko' ? '⚠️ YES — PLAIN TEXT!' : 'NO ✅'}`);
        console.log('');
    }
}

main().catch(err => console.error('Error:', err));
