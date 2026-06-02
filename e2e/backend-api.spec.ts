import { test, expect } from '@playwright/test';

// UWAGA: Ten test łączy się z PRAWDZIWĄ bazą danych pb.gryf.ai
// Tworzy tymczasowego użytkownika do zweryfikowania działania hooków w main.pb.js,
// a na koniec go kaskadowo usuwa.

const PB_URL = 'https://pb.gryf.ai';
const TEST_EMAIL = `e2e_backend_test_${Date.now()}@gryf.ai`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe.serial('PocketBase Backend Hooks & API (main.pb.js)', () => {
  let token = '';
  let userId = '';

  test('powinien stworzyć użytkownika testowego', async ({ request }) => {
    // 1. Rejestracja użytkownika
    const createRes = await request.post(`${PB_URL}/api/collections/WORKFLOW_users/records`, {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        passwordConfirm: TEST_PASSWORD,
        name: 'E2E Test User',
      }
    });
    
    // Jeśli z jakiegoś powodu użytkownik istnieje, ignorujemy błąd (choć email jest unikalny per uruchomienie)
    expect(createRes.ok()).toBeTruthy();
    const userData = await createRes.json();
    userId = userData.id;

    // 2. Logowanie, by zdobyć token auth
    const authRes = await request.post(`${PB_URL}/api/collections/WORKFLOW_users/auth-with-password`, {
      data: {
        identity: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    });

    expect(authRes.ok()).toBeTruthy();
    const authData = await authRes.json();
    token = authData.token;
    expect(token).toBeTruthy();
  });

  test('powinien poprawnie odpowiadać na /api/ai/check-key z auth', async ({ request }) => {
    expect(token).toBeTruthy();
    
    // Uderzenie w niestandardowy endpoint zdefiniowany w main.pb.js
    const res = await request.post(`${PB_URL}/api/ai/check-key`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    
    // Domyślnie nowy user nie ma klucza
    expect(data.hasKey).toBe(false);
  });

  test('powinien zablokować dostęp do /api/ai/chat bez skonfigurowanego klucza', async ({ request }) => {
    // Endpoint chat weryfikuje 'tier' oraz 'ai_api_key'
    const res = await request.post(`${PB_URL}/api/ai/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        workspaceId: "dummy-workspace",
        messages: [{ role: "user", content: "Hello" }]
      }
    });

    // Powinno zwrócić błąd z main.pb.js, np. 403 lub 400 z message o braku dostępu/klucza
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const data = await res.json();
    expect(data.message).toBeDefined();
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: usunięcie konta testowego, co powinno również uruchomić onRecordDeleteRequest z main.pb.js
    if (userId && token) {
      const delRes = await request.delete(`${PB_URL}/api/collections/WORKFLOW_users/records/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(`Cleanup użytkownika ${TEST_EMAIL}:`, delRes.status());
    }
  });
});
