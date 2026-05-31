/**
 * Interactive auth setup — run with:
 *   npx playwright test e2e/auth-setup.spec.ts --headed
 *
 * This will open a browser, enter the email, and wait for you to
 * enter the magic link code manually. Then it saves the auth state.
 */
import { test as setup } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

setup('authenticate via magic link', async ({ page }) => {
  // 1. Go to login
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // 2. Accept cookies if banner appears
  const cookieBtn = page.locator('text=/Akceptuj wszystkie|Accept/i');
  if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await cookieBtn.click();
  }

  // 3. Enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill('dwachalowicz@gmail.com');

  // 4. Click send button
  const sendBtn = page.locator('button:has-text("Wyślij"), button:has-text("Send")');
  await sendBtn.first().click();

  // 5. Wait for the OTP/code input to appear and for manual entry
  // The user will enter the code manually in the headed browser
  console.log('\n\n🔑 Kod wysłany na dwachalowicz@gmail.com');
  console.log('👉 Wpisz kod w przeglądarce i zaloguj się.');
  console.log('⏳ Czekam max 120 sekund...\n');

  // 6. Wait until we leave /login (meaning login succeeded)
  await page.waitForURL(/\/(dashboard|app)/, { timeout: 120_000 });

  console.log('✅ Zalogowano! Zapisuję stan auth...\n');

  // 7. Save auth state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });
});
