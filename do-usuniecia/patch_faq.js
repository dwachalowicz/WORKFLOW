import fs from 'fs';

const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASS = '1234567890';

async function main() {
    let authData;
    const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
    });
    
    if (!authRes.ok) {
        const superRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS })
        });
        if (!superRes.ok) throw new Error("Auth failed");
        authData = await superRes.json();
    } else {
        authData = await authRes.json();
    }
    
    const token = authData.token;

    const newAnswerPl = `<p>Na poziomie <strong>Workspace</strong> (dashboardu) istnieją cztery role, które określają co użytkownik może robić w ramach całej przestrzeni roboczej:</p><ul><li><strong>Właściciel (Owner)</strong> — pełne zarządzanie workspace'em: tworzenie/usuwanie procesów i folderów, zapraszanie i usuwanie członków, konfiguracja ustawień AI, zmiana nazwy workspace'a, a także jego usunięcie.</li><li><strong>Administrator (Admin)</strong> — posiada wszystkie uprawnienia Edytora, a dodatkowo może: zarządzać zaproszeniami, wyrzucać ludzi z zespołu, zmieniać im role, a także usuwać procesy i foldery. Nie może usunąć ani zmienić nazwy całego obszaru roboczego.</li><li><strong>Edytor (Editor)</strong> — może tworzyć i edytować procesy (ale nie może ich usuwać), tworzyć foldery (ale nie usuwać), korzystać z canvasu i zapisywać zmiany. Nie może zarządzać członkami ani ustawieniami workspace'a.</li><li><strong>Czytelnik (Viewer)</strong> — ma dostęp tylko do odczytu. Widzi procesy, może je przeglądać, ale nie może ich edytować, dodawać ani usuwać.</li></ul><p><strong>Uwaga:</strong> Te role dotyczą poziomu dashboardu — tego, kto ma dostęp do workspace'a i co może w nim robić. Nie należy ich mylić z rolami na poziomie procesu (canvasu).</p>`;

    const newAnswerEn = `<p>At the <strong>Workspace</strong> (dashboard) level, there are four roles that determine what a user can do within the entire workspace:</p><ul><li><strong>Owner</strong> — full workspace management: creating/deleting processes and folders, inviting and removing members, configuring AI settings, changing the workspace name, and deleting it.</li><li><strong>Administrator (Admin)</strong> — has all Editor permissions, and can additionally: manage invitations, remove people from the team, change their roles, and delete processes and folders. Cannot delete or rename the entire workspace.</li><li><strong>Editor</strong> — can create and edit processes (but cannot delete them), create folders (but not delete them), use the canvas and save changes. Cannot manage members or workspace settings.</li><li><strong>Viewer</strong> — has read-only access. Can see and view processes, but cannot edit, add, or delete them.</li></ul><p><strong>Note:</strong> These roles apply to the dashboard level — who has access to the workspace and what they can do in it. They should not be confused with roles at the process (canvas) level.</p>`;

    const faqId = "m8tpwq9tmnod82d";
    
    console.log("Patching FAQ " + faqId + "...");
    const patchRes = await fetch(`${PB_URL}/api/collections/WORKFLOW_faq/records/${faqId}`, {
        method: 'PATCH',
        headers: { 
            'Authorization': token,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            answer_pl: newAnswerPl,
            answer_en: newAnswerEn
        })
    });

    if (patchRes.ok) {
        console.log("FAQ patched successfully.");
    } else {
        console.error("Failed to patch FAQ:", await patchRes.text());
    }
}

main().catch(err => console.error(err));
