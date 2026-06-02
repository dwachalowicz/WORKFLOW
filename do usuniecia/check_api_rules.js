/**
 * Skrypt diagnostyczny — sprawdza API Rules kolekcji PocketBase.
 * UWAGA: Plik zawiera dane logowania admina — usunąć po użyciu!
 */

const PB_URL = "https://pb.gryf.ai";
const ADMIN_EMAIL = "admin@admin.pl";
const ADMIN_PASS = "1234567890";

const COLLECTIONS_TO_CHECK = [
  "WORKFLOW_comments",
  "WORKFLOW_versions",
  "WORKFLOW_processes",
  "WORKFLOW_workspaces",
  "WORKFLOW_workspace_members",
  "WORKFLOW_notifications",
  "WORKFLOW_users",
];

async function main() {
  // 1. Auth as admin
  console.log("Authenticating as admin...");
  const authRes = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });

  if (!authRes.ok) {
    // Try superuser auth for newer PocketBase
    console.log("Admin auth failed, trying superuser auth...");
    const suRes = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
    if (!suRes.ok) {
      console.error("Auth failed:", await suRes.text());
      process.exit(1);
    }
    var authData = await suRes.json();
  } else {
    var authData = await authRes.json();
  }

  const token = authData.token;
  console.log("Authenticated OK\n");

  // 2. Fetch and display collection rules
  for (const name of COLLECTIONS_TO_CHECK) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/${name}`, {
        headers: { Authorization: token },
      });

      if (!res.ok) {
        console.log(`=== ${name} === ERROR: ${res.status} ${res.statusText}`);
        continue;
      }

      const col = await res.json();

      console.log(`${"=".repeat(60)}`);
      console.log(`COLLECTION: ${col.name} (type: ${col.type})`);
      console.log(`${"=".repeat(60)}`);
      console.log(`  listRule:   ${col.listRule ?? "(null - admin only)"}`);
      console.log(`  viewRule:   ${col.viewRule ?? "(null - admin only)"}`);
      console.log(`  createRule: ${col.createRule ?? "(null - admin only)"}`);
      console.log(`  updateRule: ${col.updateRule ?? "(null - admin only)"}`);
      console.log(`  deleteRule: ${col.deleteRule ?? "(null - admin only)"}`);

      // Show fields
      if (col.schema && col.schema.length > 0) {
        console.log(`  fields:`);
        for (const f of col.schema) {
          console.log(`    - ${f.name} (${f.type})${f.required ? " [required]" : ""}`);
        }
      } else if (col.fields && col.fields.length > 0) {
        console.log(`  fields:`);
        for (const f of col.fields) {
          console.log(`    - ${f.name} (${f.type})${f.required ? " [required]" : ""}`);
        }
      }

      console.log("");
    } catch (err) {
      console.error(`Error checking ${name}:`, err.message);
    }
  }
}

main().catch(console.error);
