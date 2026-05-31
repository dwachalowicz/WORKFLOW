const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    console.log('Logowanie...');
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
        console.error("Logowanie nie powiodło się");
        return;
    }
    const { token } = await authRes.json();

    console.log('Pobieranie wszystkich kolekcji...');
    const collRes = await fetch(`${PB_URL}/api/collections?perPage=500`, {
        headers: { 'Authorization': token }
    });
    const collectionsData = await collRes.json();
    const collections = collectionsData.items.filter(c => c.name.startsWith('WORKFLOW_') || c.name.startsWith('GRYF_'));

    let fixedCount = 0;

    for (let coll of collections) {
        if (coll.type === 'view') continue; // Views don't have standard created/updated fields managed this way
        
        let modified = false;
        
        if (!coll.fields.find(f => f.name === 'created')) {
            console.log(`[${coll.name}] Brak pola 'created'. Dodawanie...`);
            coll.fields.push({
                name: "created",
                type: "autodate",
                onCreate: true,
                onUpdate: false,
                hidden: false,
                system: false
            });
            modified = true;
        }

        if (!coll.fields.find(f => f.name === 'updated')) {
            console.log(`[${coll.name}] Brak pola 'updated'. Dodawanie...`);
            coll.fields.push({
                name: "updated",
                type: "autodate",
                onCreate: true,
                onUpdate: true,
                hidden: false,
                system: false
            });
            modified = true;
        }

        if (modified) {
            console.log(`[${coll.name}] Patchowanie kolekcji...`);
            const patchRes = await fetch(`${PB_URL}/api/collections/${coll.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(coll)
            });

            if (!patchRes.ok) {
                console.error(`[${coll.name}] BŁĄD aktualizacji:`, await patchRes.text());
            } else {
                console.log(`[${coll.name}] Zaktualizowano pomyślnie.`);
                fixedCount++;
            }
        }
    }

    if (fixedCount === 0) {
        console.log('Wszystkie kolekcje mają już ustawione poprawne pola created i updated.');
    } else {
        console.log(`Zaktualizowano ${fixedCount} kolekcji.`);
    }
}
main();
