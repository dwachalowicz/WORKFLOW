/**
 * PocketBase Connection Test Script
 * 
 * Łączy się z bazą PocketBase (pb.gryf.ai), loguje jako superuser,
 * i wyświetla aktualny prompt systemowy AI (WORKFLOW_prompts, key: assistant_system).
 * 
 * Użycie:
 *   node pb_connection_test.js              — wyświetl prompt
 *   node pb_connection_test.js --show       — wyświetl pełny prompt
 *   node pb_connection_test.js --collections — wyświetl listę kolekcji
 * 
 * Wymagania: Node.js 18+
 * Do usunięcia po użyciu.
 */

const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASSWORD = '1234567890';

// PocketBase v0.23+ uses _superusers collection for admin auth
// Fallback to legacy /api/admins endpoint for older versions
const AUTH_ENDPOINTS = [
  '/api/collections/_superusers/auth-with-password',
  '/api/admins/auth-with-password',
];

async function pbRequest(path, options = {}) {
  const url = `${PB_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

async function adminAuth() {
  console.log(`\n🔐 Logowanie jako admin do ${PB_URL}...`);
  
  for (const endpoint of AUTH_ENDPOINTS) {
    try {
      const data = await pbRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      console.log(`✅ Zalogowano pomyślnie (endpoint: ${endpoint})`);
      return data.token;
    } catch (err) {
      console.log(`  ⚠️  Endpoint ${endpoint} — ${err.message.substring(0, 80)}`);
    }
  }
  
  throw new Error('Nie udało się zalogować żadnym endpointem admin. Sprawdź dane logowania.');
}

async function listCollections(token) {
  console.log('\n📋 Kolekcje w bazie:');
  const data = await pbRequest('/api/collections?perPage=100', {
    headers: { Authorization: token },
  });
  const collections = data.items || [];
  collections.sort((a, b) => a.name.localeCompare(b.name));
  for (const col of collections) {
    const fieldNames = (col.fields || col.schema || []).map(f => f.name).join(', ');
    console.log(`  • ${col.name} (${col.type}) — ${fieldNames}`);
  }
  console.log(`\n  Razem: ${collections.length} kolekcji`);
}

async function getPrompt(token) {
  console.log('\n📝 Prompt systemowy AI (WORKFLOW_prompts, key: "assistant_system"):');
  const data = await pbRequest(
    `/api/collections/WORKFLOW_prompts/records?filter=(key='assistant_system')&perPage=1`,
    { headers: { Authorization: token } }
  );
  const items = data.items || [];
  if (items.length === 0) {
    console.log('  ⚠️  Nie znaleziono promptu "assistant_system" w kolekcji WORKFLOW_prompts.');
    console.log('  Asystent AI używa domyślnego (fallback) promptu wbudowanego w main.pb.js.');
    return null;
  }
  const prompt = items[0];
  console.log(`  ID: ${prompt.id}`);
  console.log(`  Key: ${prompt.key}`);
  console.log(`  Active: ${prompt.active}`);
  console.log(`  Created: ${prompt.created}`);
  console.log(`  Updated: ${prompt.updated}`);
  
  const content = prompt.content || '';
  if (process.argv.includes('--show')) {
    console.log('\n--- PEŁNA TREŚĆ PROMPTU ---');
    console.log(content);
    console.log('--- KONIEC PROMPTU ---');
  } else {
    const preview = content.length > 500 ? content.substring(0, 500) + '...' : content;
    console.log(`\n  Treść (podgląd, ${content.length} znaków):`);
    console.log(`  ${preview}`);
    console.log('\n  💡 Użyj --show żeby zobaczyć pełny prompt');
  }
  return prompt;
}

async function main() {
  try {
    const token = await adminAuth();
    
    if (process.argv.includes('--collections')) {
      await listCollections(token);
    }
    
    await getPrompt(token);
    
    console.log('\n✅ Gotowe.');
  } catch (err) {
    console.error('\n❌ Błąd:', err.message);
    process.exit(1);
  }
}

main();
