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

    console.log('Pobieranie WORKFLOW_users...');
    const collRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users`, {
        headers: { 'Authorization': token }
    });
    const coll = await collRes.json();

    if (!coll.fields.find(f => f.name === 'ai_custom_memory')) {
        coll.fields.push({
            name: "ai_custom_memory",
            type: "number",
            required: false,
            presentable: false,
            unique: false,
            options: {
                min: 1,
                max: 100,
                noDecimal: true
            }
        });
        console.log('Dodaję kolumnę ai_custom_memory...');
    } else {
        console.log('Kolumna ai_custom_memory już istnieje.');
        return;
    }

    console.log('Aktualizacja WORKFLOW_users...');
    const patchRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users`, {
        method: 'PATCH',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(coll)
    });

    if (!patchRes.ok) {
        console.error('BŁĄD:', await patchRes.text());
    } else {
        console.log('Sukces! Kolumna dodana.');
    }
}
main();
