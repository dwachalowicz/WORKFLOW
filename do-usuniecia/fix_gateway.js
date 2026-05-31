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

    // Replace the gateway rule
    const oldRule = '- Węzły decyzyjne mają typ "gateway" (np. "Decyzja kierownika").';
    const newRule = '- Rozgałęzienia wykonuj BEZPOŚREDNIO ze zwykłych węzłów (typ "simple"). Po prostu wyprowadź 2 krawędzie z tego samego source, a warunki wpisz na tych krawędziach (NIE dodawaj dedykowanych węzłów typu "gateway").';

    if (content.includes(oldRule)) {
        content = content.replace(oldRule, newRule);
    } else {
        console.log("Could not find the gateway rule text.");
    }
    
    // Also remove any mention of gateway in the edge format example
    const oldEdgeExample = 'Inna krawędź (alternatywa, np. po węźle typu gateway):';
    const newEdgeExample = 'Inna krawędź (alternatywa, np. jako drugie wyjście z tego samego etapu):';

    if (content.includes(oldEdgeExample)) {
        content = content.replace(oldEdgeExample, newEdgeExample);
    }

    const oldGatewayRule2 = '- Gdy proces się rozgałęzia (szczególnie po węźle gateway), używaj zmiennych z poprzednich etapów do ustawienia warunków na krawędzi.';
    const newGatewayRule2 = '- Gdy proces się rozgałęzia, używaj zmiennych z danego lub z poprzednich etapów do ustawienia warunków na krawędziach wyjściowych.';

    if (content.includes(oldGatewayRule2)) {
        content = content.replace(oldGatewayRule2, newGatewayRule2);
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
    console.log('Prompt successfully updated to remove gateway nodes and branch directly!');
}

main().catch(console.error);
