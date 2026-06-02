/**
 * Skrypt naprawczy #2:
 * 1. WORKFLOW_comments deleteRule — workspace owner/admin może moderować
 * 2. WORKFLOW_processes — ukryj publicPassword (hidden field)
 * UWAGA: Plik zawiera dane logowania admina — usunąć po użyciu!
 */

const PB_URL = "https://pb.gryf.ai";
const ADMIN_EMAIL = "admin@admin.pl";
const ADMIN_PASS = "1234567890";

async function getToken() {
  let res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  if (!res.ok) {
    res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASS }),
    });
  }
  if (!res.ok) throw new Error("Auth failed: " + await res.text());
  return (await res.json()).token;
}

async function getCollection(token, name) {
  const res = await fetch(`${PB_URL}/api/collections/${name}`, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error(`GET ${name} failed: ${res.status}`);
  return res.json();
}

async function updateCollection(token, nameOrId, updates) {
  const res = await fetch(`${PB_URL}/api/collections/${nameOrId}`, {
    method: "PATCH",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${nameOrId} failed (${res.status}): ${body}`);
  }
  return res.json();
}

// --- Nowe reguły delete/update dla komentarzy ---
// Autor ALBO workspace owner ALBO workspace admin może usuwać
const COMMENTS_DELETE = [
  '@request.auth.id = author',
  '|| @collection.WORKFLOW_processes.id ?= process && (',
  '  @collection.WORKFLOW_workspaces.id ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspaces.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= \'active\' && @collection.WORKFLOW_workspace_members.role ?= \'admin\'',
  ')',
].join(' ');

// Update — nadal tylko autor (logiczne — nie chcemy żeby admin edytował treść komentarza)
const COMMENTS_UPDATE = '@request.auth.id = author';

async function main() {
  const token = await getToken();
  console.log("Authenticated OK\n");

  // === FIX 1: WORKFLOW_comments deleteRule ===
  console.log("FIX 1: Updating WORKFLOW_comments deleteRule...");
  const commentsCol = await getCollection(token, "WORKFLOW_comments");
  console.log("  OLD deleteRule:", commentsCol.deleteRule);
  console.log("  NEW deleteRule:", COMMENTS_DELETE);
  
  await updateCollection(token, commentsCol.id, {
    deleteRule: COMMENTS_DELETE,
    updateRule: COMMENTS_UPDATE,
  });
  console.log("  ✅ WORKFLOW_comments deleteRule updated!\n");

  // === FIX 2: WORKFLOW_processes — hide publicPassword field ===
  console.log("FIX 2: Hiding publicPassword field in WORKFLOW_processes...");
  const processesCol = await getCollection(token, "WORKFLOW_processes");
  
  const fields = processesCol.schema || processesCol.fields || [];
  let found = false;
  for (const f of fields) {
    if (f.name === "publicPassword") {
      console.log("  Current hidden:", f.hidden || false);
      f.hidden = true;
      found = true;
      break;
    }
  }
  
  if (found) {
    await updateCollection(token, processesCol.id, {
      schema: fields,
    });
    console.log("  ✅ publicPassword field set to hidden!\n");
  } else {
    console.log("  ⚠️ publicPassword field not found in schema, trying 'fields' key...\n");
    // Try with 'fields' key instead
    const fields2 = processesCol.fields || [];
    for (const f of fields2) {
      if (f.name === "publicPassword") {
        f.hidden = true;
        found = true;
        break;
      }
    }
    if (found) {
      await updateCollection(token, processesCol.id, { fields: fields2 });
      console.log("  ✅ publicPassword field set to hidden!\n");
    } else {
      console.log("  ❌ publicPassword field not found at all.\n");
    }
  }

  console.log("=== ALL FIXES APPLIED ===");
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
