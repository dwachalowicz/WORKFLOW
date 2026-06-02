/**
 * Skrypt naprawczy — aktualizuje API Rules kolekcji PocketBase.
 * Dodaje sprawdzenie workspace.owner we wszystkich regułach, które tego potrzebują.
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

// ============================================================
// Nowe reguły — z dodanym sprawdzaniem workspace.owner
// ============================================================

// WZORZEC WSPÓLNY dla komentarzy i wersji:
// Użytkownik może widzieć/tworzyć, jeśli:
//   1. jest właścicielem procesu (process.owner), LUB
//   2. jest właścicielem workspace'a (process.workspace -> workspace.owner), LUB
//   3. jest aktywnym członkiem workspace'a procesu

const COMMENTS_LIST_VIEW_CREATE = [
  '@collection.WORKFLOW_processes.id ?= process && (',
  '  @collection.WORKFLOW_processes.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspaces.id ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspaces.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= \'active\'',
  ')',
].join(' ');

// update/delete — tylko autor komentarza (nie zmieniam!)
const COMMENTS_UPDATE = '@request.auth.id = author';
const COMMENTS_DELETE = '@request.auth.id = author';

const VERSIONS_LIST_VIEW = COMMENTS_LIST_VIEW_CREATE; // identyczna logika

const VERSIONS_CREATE = [
  '@collection.WORKFLOW_processes.id ?= process && (',
  '  @collection.WORKFLOW_processes.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspaces.id ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspaces.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= \'active\' && (@collection.WORKFLOW_workspace_members.role ?= \'admin\' || @collection.WORKFLOW_workspace_members.role ?= \'editor\')',
  ')',
].join(' ');

const VERSIONS_UPDATE = VERSIONS_CREATE;

const VERSIONS_DELETE = [
  '@collection.WORKFLOW_processes.id ?= process && (',
  '  @collection.WORKFLOW_processes.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspaces.id ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspaces.owner ?= @request.auth.id',
  '  || @collection.WORKFLOW_workspace_members.workspace ?= @collection.WORKFLOW_processes.workspace && @collection.WORKFLOW_workspace_members.user ?= @request.auth.id && @collection.WORKFLOW_workspace_members.status ?= \'active\' && @collection.WORKFLOW_workspace_members.role ?= \'admin\'',
  ')',
].join(' ');

async function main() {
  const token = await getToken();
  console.log("Authenticated OK\n");

  // --- WORKFLOW_comments ---
  console.log("Updating WORKFLOW_comments rules...");
  const commentsCol = await getCollection(token, "WORKFLOW_comments");
  
  console.log("  OLD listRule:", commentsCol.listRule);
  console.log("  NEW listRule:", COMMENTS_LIST_VIEW_CREATE);
  
  await updateCollection(token, commentsCol.id, {
    listRule: COMMENTS_LIST_VIEW_CREATE,
    viewRule: COMMENTS_LIST_VIEW_CREATE,
    createRule: COMMENTS_LIST_VIEW_CREATE,
    updateRule: COMMENTS_UPDATE,
    deleteRule: COMMENTS_DELETE,
  });
  console.log("  ✅ WORKFLOW_comments updated!\n");

  // --- WORKFLOW_versions ---
  console.log("Updating WORKFLOW_versions rules...");
  const versionsCol = await getCollection(token, "WORKFLOW_versions");
  
  console.log("  OLD listRule:", versionsCol.listRule);
  console.log("  NEW listRule:", VERSIONS_LIST_VIEW);
  
  await updateCollection(token, versionsCol.id, {
    listRule: VERSIONS_LIST_VIEW,
    viewRule: VERSIONS_LIST_VIEW,
    createRule: VERSIONS_CREATE,
    updateRule: VERSIONS_UPDATE,
    deleteRule: VERSIONS_DELETE,
  });
  console.log("  ✅ WORKFLOW_versions updated!\n");

  console.log("=== DONE! All rules patched. ===");
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
