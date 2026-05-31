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

    const oldText = '- Zawsze po krawędzi warunkowej, twórz też drugą krawędź alternatywną z "conditionType": "else".';
    const newText = oldText + '\n- TWORZENIE LOGIKI BIZNESOWEJ: Zawsze projektuj SENSOWNE rozgałęzienia, które pasują do logiki (np. Akceptacja vs Odrzucenie reklamacji). W procesach biznesowych przynajmniej jeden etap "decyzyjny" powinien mieć 2 wyjścia (warunkowe "rule" i alternatywne "else"), prowadzące do dwóch RÓŻNYCH etapów (np. "Wysyłka towaru" vs "Informacja o odrzuceniu").';

    if (content.includes(oldText) && !content.includes('TWORZENIE LOGIKI BIZNESOWEJ')) {
        content = content.replace(oldText, newText);
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
    console.log('Prompt successfully updated with logical branching enforcement!');
}

main().catch(console.error);
