const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    console.log('1. Auth as admin...');
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) return;
    const token = (await authRes.json()).token;

    console.log('2. Fetching existing prompt...');
    const promptRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_prompts/records?filter=(key='assistant_system')`, {
        headers: { 'Authorization': token }
    });
    
    const data = await promptRes.json();
    if (data.items.length > 0) {
        console.log('\n--- CURRENT PROMPT START ---\n');
        console.log(data.items[0].content);
        console.log('\n--- CURRENT PROMPT END ---\n');
    }
}

main().catch(console.error);
