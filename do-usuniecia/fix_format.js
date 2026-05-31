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

    // Find the format block
    const oldFormatString = `FORMAT WĘZŁA (NIE dodawaj pól "editors" ani "readers" — to jest zarządzane osobno przez użytkownika):
{ "id": "ai-node-1", "type": "simple", "position": {"x": 680, "y": 300}, "data": { "label": "Nazwa", "description": "Opis etapu", "maxDuration": 2, "maxDurationUnit": "h", "cost": 150, "checklist": [{"id": "c1", "label": "Krok", "required": true}] } }`;

    const newFormatString = `FORMAT WĘZŁA (NIE dodawaj pól "editors" ani "readers" — to jest zarządzane osobno przez użytkownika):
{ "id": "ai-node-1", "type": "simple", "position": {"x": 680, "y": 300}, "data": { "label": "Nazwa", "description": "Opis etapu", "icon": "FileText", "maxDuration": 2, "maxDurationUnit": "h", "cost": 150, "enterActionTypes": ["email"], "exitActionTypes": ["webhook"], "checklist": [{"id": "c1", "label": "Krok", "required": true}], "variables": [{"name": "Imię", "type": "text", "required": true}, {"name": "Zatwierdzone", "type": "boolean"}] } }

WAŻNE ZASADY DLA DANYCH WĘZŁA:
- "icon": Dobieraj nazwy ikon po angielsku (Lucide, np. User, Mail, FileText, CheckSquare, Settings, Database, Truck, itd.).
- "variables": Dodawaj zmienne dla etapów, które wymagają zebrania danych. Dostępne typy to: "text", "number", "date", "boolean".
- "enterActionTypes" / "exitActionTypes": jeśli wymagana jest notyfikacja lub webhook, ustaw to w tablicy (np. ["email"]).
`;

    if (content.includes(oldFormatString)) {
        content = content.replace(oldFormatString, newFormatString);
        console.log("Replaced successfully!");
    } else {
        console.log("Warning: Could not find the exact old format string!");
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
    console.log('Prompt successfully updated with proper node format example!');
}

main().catch(console.error);
