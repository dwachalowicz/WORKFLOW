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

    console.log('Monitoring process "ds" (2dk63st2txjzbow) every 3 seconds...\n');
    
    for (let i = 0; i < 20; i++) {
        const res = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes/records/2dk63st2txjzbow?fields=id,name,isPublic,publicPassword,updated`, { headers });
        const proc = await res.json();
        const pwd = proc.publicPassword || '';
        const time = new Date().toLocaleTimeString();
        console.log(`[${time}] isPublic=${proc.isPublic} | password=${pwd ? `"${pwd.substring(0,20)}..." (${pwd.length} chars)` : '(empty)'} | updated=${proc.updated}`);
        
        if (pwd) {
            console.log(`\n✅ PASSWORD DETECTED! Full value: "${pwd}"`);
            console.log(`Is SHA-256 hash? ${/^[a-f0-9]{64}$/i.test(pwd) ? 'YES' : 'NO'}`);
            break;
        }
        await new Promise(r => setTimeout(r, 3000));
    }
}

main().catch(err => console.error('Error:', err));
