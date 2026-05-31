/**
 * Aktualizacja PocketBase API Rules dla kolekcji WORKFLOW_processes.
 * 
 * Zmiana: dodanie roli 'editor' obok 'admin' w createRule, updateRule i deleteRule.
 * Viewer nadal ma dostęp tylko do odczytu (listRule i viewRule bez zmian).
 */
const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    // 1. Auth as superuser
    console.log('Logowanie jako superuser...');
    const authRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });

    if (!authRes.ok) {
        console.error('BŁĄD auth:', await authRes.text());
        process.exit(1);
    }

    const { token } = await authRes.json();
    console.log('OK\n');

    // 2. Fetch current collection schema
    console.log('Pobieranie schematu kolekcji WORKFLOW_processes...');
    const collRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes`, {
        headers: { 'Authorization': token }
    });

    if (!collRes.ok) {
        console.error('BŁĄD fetch collection:', await collRes.text());
        process.exit(1);
    }

    const collection = await collRes.json();
    console.log('Aktualne reguły:');
    console.log('  createRule:', collection.createRule);
    console.log('  updateRule:', collection.updateRule);
    console.log('  deleteRule:', collection.deleteRule);
    console.log();

    // 3. Define new rules — dodajemy 'editor' obok 'admin'
    // Wzorzec: (role ?= 'admin' || role ?= 'editor') zamiast role ?= 'admin'
    //
    // Pełna reguła członkowska (member condition):
    //   @collection.WORKFLOW_workspace_members.workspace ?= workspace
    //   && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id
    //   && @collection.WORKFLOW_workspace_members.status ?= 'active'
    //   && (@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor')

    const memberConditionEditorOrAdmin = [
        "@collection.WORKFLOW_workspace_members.workspace ?= workspace",
        "@collection.WORKFLOW_workspace_members.user ?= @request.auth.id",
        "@collection.WORKFLOW_workspace_members.status ?= 'active'",
        "(@collection.WORKFLOW_workspace_members.role ?= 'admin' || @collection.WORKFLOW_workspace_members.role ?= 'editor')"
    ].join(' && ');

    const ownerCondition = "@collection.WORKFLOW_workspaces.owner ?= @request.auth.id";
    const workspaceExists = "@collection.WORKFLOW_workspaces.id ?= workspace";

    const newWriteRule = `${workspaceExists} && (${ownerCondition} || ${memberConditionEditorOrAdmin})`;

    console.log('Nowa reguła (create/update/delete):');
    console.log(' ', newWriteRule);
    console.log();

    // 4. Update collection rules via PATCH
    console.log('Aktualizacja reguł w PocketBase...');
    const updateRes = await fetch(`${PB_URL}/api/collections/${collection.id}`, {
        method: 'PATCH',
        headers: {
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            createRule: newWriteRule,
            updateRule: newWriteRule,
            deleteRule: newWriteRule
        })
    });

    if (!updateRes.ok) {
        const errText = await updateRes.text();
        console.error('BŁĄD aktualizacji:', errText);
        process.exit(1);
    }

    console.log('✅ Reguły zaktualizowane pomyślnie!\n');

    // 5. Verify
    console.log('Weryfikacja...');
    const verifyRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_processes`, {
        headers: { 'Authorization': token }
    });
    const verified = await verifyRes.json();
    console.log('  createRule:', verified.createRule);
    console.log('  updateRule:', verified.updateRule);
    console.log('  deleteRule:', verified.deleteRule);
    console.log('\n✅ Gotowe!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
