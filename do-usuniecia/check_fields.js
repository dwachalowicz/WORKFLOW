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

    const usersRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_users`, {
        headers: { 'Authorization': token }
    });
    const usersColl = await usersRes.json();
    const createdField = usersColl.fields.find(f => f.name === 'created');
    const updatedField = usersColl.fields.find(f => f.name === 'updated');
    
    console.log("Created field structure:", JSON.stringify(createdField, null, 2));
    console.log("Updated field structure:", JSON.stringify(updatedField, null, 2));
}
main();
