/**
 * PocketBase Prompt Update Script
 * 
 * Aktualizuje prompt systemowy AI w bazie — poprawia instrukcje dotyczące
 * krawędzi bazodanowych (sourceHandle/targetHandle/dbOperation).
 * 
 * Użycie:
 *   node pb_update_prompt.js              — podgląd zmian (dry-run)
 *   node pb_update_prompt.js --apply      — zastosuj zmiany w bazie
 * 
 * Wymagania: Node.js 18+
 * Do usunięcia po użyciu.
 */

const PB_URL = 'https://pb.gryf.ai';
const ADMIN_EMAIL = 'admin@admin.pl';
const ADMIN_PASSWORD = '1234567890';

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
  for (const endpoint of AUTH_ENDPOINTS) {
    try {
      const data = await pbRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      });
      return data.token;
    } catch { /* try next */ }
  }
  throw new Error('Nie udało się zalogować.');
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');
  
  try {
    console.log('🔐 Logowanie...');
    const token = await adminAuth();
    console.log('✅ Zalogowano\n');

    // Pobierz prompt
    const data = await pbRequest(
      `/api/collections/WORKFLOW_prompts/records?filter=(key='assistant_system')&perPage=1`,
      { headers: { Authorization: token } }
    );
    
    if (!data.items || data.items.length === 0) {
      console.log('⚠️  Nie znaleziono promptu "assistant_system".');
      return;
    }

    const prompt = data.items[0];
    const oldContent = prompt.content || '';

    // === POPRAWKI ===
    
    // 1. Popraw targetHandle: "top" -> "db" w instrukcji o krawędziach bazodanowych
    let newContent = oldContent.replace(
      /\"targetHandle\":\s*\"top\"/g,
      '"targetHandle": "db"'
    );

    // 2. Zamień starą instrukcję o krawędziach bazodanowych na bardziej szczegółową z dbOperation
    //    (szukamy wersji po zamianie "top"->"db", bo replace powyżej już to zmienił)
    const oldDbEdgePattern = /Krawędź do takiego węzła musi mieć "sourceHandle": "db" oraz "targetHandle": "db"\./;
    const newDbEdgeInstruction = 'Krawędź do takiego węzła MUSI mieć "sourceHandle": "db", "targetHandle": "db" oraz w polu data obiekt z "dbOperation": "read" (dopuszczalne wartości: "read", "write", "readwrite"). Przykład: {"id": "ai-edge-db", "type": "custom", "source": "ai-node-1", "target": "db-1", "sourceHandle": "db", "targetHandle": "db", "data": {"dbOperation": "read"}}.';
    
    newContent = newContent.replace(oldDbEdgePattern, newDbEdgeInstruction);

    // Pokaż diff
    if (oldContent === newContent) {
      console.log('ℹ️  Brak zmian do zastosowania — prompt jest już aktualny.');
      return;
    }

    console.log('📝 Zmiany do zastosowania:\n');
    
    // Prosty diff - pokaż różnice linia po linii
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const maxLen = Math.max(oldLines.length, newLines.length);
    let changesCount = 0;
    
    for (let i = 0; i < maxLen; i++) {
      const ol = oldLines[i] || '';
      const nl = newLines[i] || '';
      if (ol !== nl) {
        changesCount++;
        console.log(`  Linia ${i + 1}:`);
        console.log(`  ❌ STARE: ${ol.substring(0, 200)}`);
        console.log(`  ✅ NOWE:  ${nl.substring(0, 200)}`);
        console.log('');
      }
    }
    
    console.log(`  Razem: ${changesCount} zmian(y)`);

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN — zmiany NIE zostały zapisane.');
      console.log('  Użyj --apply żeby zapisać do bazy.');
    } else {
      // Zapisz do bazy
      await pbRequest(
        `/api/collections/WORKFLOW_prompts/records/${prompt.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: token },
          body: JSON.stringify({ content: newContent }),
        }
      );
      console.log('\n✅ Prompt zaktualizowany w bazie!');
    }
  } catch (err) {
    console.error('\n❌ Błąd:', err.message);
    process.exit(1);
  }
}

main();
