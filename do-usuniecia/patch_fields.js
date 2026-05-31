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

    console.log('Pobieranie WORKFLOW_notifications...');
    const collRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_notifications`, {
        headers: { 'Authorization': token }
    });
    const coll = await collRes.json();

    if (!coll.fields.find(f => f.name === 'created')) {
        coll.fields.push({
            name: "created",
            type: "autodate",
            onCreate: true,
            onUpdate: false,
            hidden: false,
            system: false
        });
    }

    if (!coll.fields.find(f => f.name === 'updated')) {
        coll.fields.push({
            name: "updated",
            type: "autodate",
            onCreate: true,
            onUpdate: true,
            hidden: false,
            system: false
        });
    }

    console.log('Aktualizacja WORKFLOW_notifications...');
    const patchRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_notifications`, {
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
        console.log('Sukces!');
    }
}
main();
