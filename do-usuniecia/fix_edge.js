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

    const oldFormatEdge = `FORMAT KRAWĘDZI:
{ "id": "ai-edge-1", "type": "custom", "source": "node-a", "target": "ai-node-1", "sourceHandle": "right", "targetHandle": "left" }`;

    const newFormatEdge = `FORMAT KRAWĘDZI:
{ "id": "ai-edge-1", "type": "custom", "source": "node-a", "target": "ai-node-1", "sourceHandle": "right", "targetHandle": "left", "data": { "conditionType": "rule", "ruleCombinator": "AND", "rules": [{ "id": "r1", "variable": "Zatwierdzone", "operator": "==", "value": "true" }] } }
Inna krawędź (alternatywa, np. po węźle typu gateway):
{ "id": "ai-edge-2", "type": "custom", "source": "node-a", "target": "ai-node-2", "sourceHandle": "right", "targetHandle": "left", "data": { "conditionType": "else" } }

WAŻNE ZASADY DLA KRAWĘDZI I ROZGAŁĘZIEŃ:
- Węzły decyzyjne mają typ "gateway" (np. "Decyzja kierownika").
- Gdy proces się rozgałęzia (szczególnie po węźle gateway), używaj zmiennych z poprzednich etapów do ustawienia warunków na krawędzi.
- Dla krawędzi warunkowej ustaw w "data": "conditionType": "rule" oraz tablicę "rules" (jak w przykładzie).
- Zawsze po krawędzi warunkowej, twórz też drugą krawędź alternatywną z "conditionType": "else".`;

    if (content.includes(oldFormatEdge)) {
        content = content.replace(oldFormatEdge, newFormatEdge);
        console.log("Edge format replaced successfully!");
    } else {
        console.log("Warning: Could not find the exact old edge format string!");
        
        // Let's do a fallback replace if the exact string isn't found
        if (!content.includes('Węzły decyzyjne mają typ "gateway"')) {
            content = content.replace('FORMAT KRAWĘDZI:', 'FORMAT KRAWĘDZI:\n' + newFormatEdge.split('\n').slice(1).join('\n'));
        }
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
    console.log('Prompt successfully updated with Edge rules and Gateway instructions!');
}

main().catch(console.error);
