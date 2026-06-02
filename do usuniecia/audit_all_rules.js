/**
 * Pełny audit API Rules dla wszystkich kolekcji WORKFLOW_*
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

async function main() {
  const token = await getToken();
  console.log("Authenticated OK\n");

  // Get all collections
  const res = await fetch(`${PB_URL}/api/collections?perPage=200`, {
    headers: { Authorization: token },
  });
  const data = await res.json();
  
  const collections = (data.items || data)
    .filter(c => c.name && c.name.startsWith("WORKFLOW_"))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Found ${collections.length} WORKFLOW_ collections\n`);

  for (const col of collections) {
    console.log(`${"=".repeat(70)}`);
    console.log(`COLLECTION: ${col.name} (type: ${col.type})`);
    console.log(`${"=".repeat(70)}`);
    
    const rules = {
      listRule: col.listRule,
      viewRule: col.viewRule,
      createRule: col.createRule,
      updateRule: col.updateRule,
      deleteRule: col.deleteRule,
    };

    for (const [key, val] of Object.entries(rules)) {
      const display = val === null ? "NULL (admin-only)" : val === "" ? "EMPTY (any authenticated user)" : val;
      console.log(`  ${key.padEnd(12)}: ${display}`);
    }

    // Fields summary
    const fields = col.schema || col.fields || [];
    if (fields.length > 0) {
      console.log(`  fields:`);
      for (const f of fields) {
        const extras = [];
        if (f.required) extras.push("required");
        if (f.unique) extras.push("unique");
        if (f.type === "relation" && f.options?.collectionId) extras.push(`-> ${f.options.collectionId}`);
        if (f.type === "select" && f.options?.values) extras.push(`values: [${f.options.values.join(", ")}]`);
        console.log(`    - ${f.name} (${f.type})${extras.length ? ` [${extras.join(", ")}]` : ""}`);
      }
    }
    console.log("");
  }
}

main().catch(err => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
