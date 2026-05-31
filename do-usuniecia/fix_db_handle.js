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
    const prompt = data.items[0];
    let content = prompt.content;

    const oldText = 'Każdy edge MUSI mieć sourceHandle i targetHandle (użyj "right"→"left" dla poziomego layoutu (od lewej do prawej))';
    const newText = 'Każdy edge MUSI mieć sourceHandle i targetHandle (użyj "right"→"left" dla standardowych położeń. WYJĄTEK: Jeśli węzłem docelowym (target) jest "database", to sourceHandle ZAWSZE musi być "db")';

    if (content.includes(oldText)) {
        content = content.replace(oldText, newText);
    } else {
        // Fallback
        content = content.replace('Każdy edge MUSI mieć sourceHandle', newText);
    }

    const additionalDbRule = `
- WĘZŁY BAZ DANYCH / SYSTEMÓW: Aby pokazać możliwości aplikacji, podczas generowania nowych procesów powinieneś dodatkowo wygenerować 1 lub 2 węzły typu "database" (np. reprezentujące system ERP, CRM, Bazę Klientów, itp.) i połączyć je krawędziami z odpowiednimi etapami, w których te dane są pobierane lub zapisywane. Użyj formatu: {"id": "db-1", "type": "database", "data": {"label": "System CRM", "icon": "Database", "description": "Baza klientów"}}. Krawędź do takiego węzła musi mieć "sourceHandle": "db" oraz "targetHandle": "top".`;

    const oldDbRule = `- WĘZŁY BAZ DANYCH / SYSTEMÓW: Aby pokazać możliwości aplikacji, podczas generowania nowych procesów powinieneś dodatkowo wygenerować 1 lub 2 węzły typu "database" (np. reprezentujące system ERP, CRM, Bazę Klientów, itp.) i połączyć je krawędziami z odpowiednimi etapami, w których te dane są pobierane lub zapisywane. Użyj formatu: {"id": "db-1", "type": "database", "data": {"label": "System CRM", "icon": "Database", "description": "Baza klientów"}}`;

    if (content.includes(oldDbRule) && !content.includes('"sourceHandle": "db" oraz "targetHandle": "top"')) {
        content = content.replace(oldDbRule, additionalDbRule.trim());
    }

    console.log('3. Updating prompt...');
    await fetch(`${PB_URL}/api/collections/WORKFLOW_prompts/records/${prompt.id}`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: content })
    });
    console.log('Prompt successfully updated with DB handle rules!');
}

main().catch(console.error);
