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
    const { token } = await authRes.json();

    console.log('Pobieranie WORKFLOW_notifications...');
    const collRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_notifications`, {
        headers: { 'Authorization': token }
    });
    const coll = await collRes.json();
    console.log(JSON.stringify(coll, null, 2));
}
main();
