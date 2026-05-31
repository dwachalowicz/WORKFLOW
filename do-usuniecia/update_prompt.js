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
    
    if (!authRes.ok) {
        console.error('Auth failed:', await authRes.text());
        return;
    }
    const token = (await authRes.json()).token;

    console.log('2. Fetching existing prompt...');
    const promptRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_prompts/records?filter=(key='assistant_system')`, {
        headers: { 'Authorization': token }
    });
    
    if (!promptRes.ok) {
        console.error('Failed to fetch prompt:', await promptRes.text());
        return;
    }
    const data = await promptRes.json();
    if (data.items.length === 0) {
        console.error('Prompt not found');
        return;
    }

    const prompt = data.items[0];
    let content = prompt.content;

    // We will add an instruction about generating 'database' nodes
    const dataNodesInstruction = `
- WĘZŁY BAZ DANYCH / SYSTEMÓW: Aby pokazać możliwości aplikacji, podczas generowania nowych procesów powinieneś dodatkowo wygenerować 1 lub 2 węzły typu "database" (np. reprezentujące system ERP, CRM, Bazę Klientów, itp.) i połączyć je krawędziami z odpowiednimi etapami, w których te dane są pobierane lub zapisywane. Użyj formatu: {"id": "db-1", "type": "database", "data": {"label": "System CRM", "icon": "Database", "description": "Baza klientów"}}`;

    if (!content.includes('WĘZŁY BAZ DANYCH / SYSTEMÓW')) {
        content = content.replace('KLUCZOWE ZASADY GENEROWANIA JSON:', 'KLUCZOWE ZASADY GENEROWANIA JSON:' + dataNodesInstruction);
    }
    
    console.log('3. Updating prompt...');
    const updateRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_prompts/records/${prompt.id}`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: content })
    });

    if (!updateRes.ok) {
        console.error('Update failed:', await updateRes.text());
        return;
    }

    console.log('Prompt successfully updated with database nodes instruction!');
}

main().catch(console.error);
