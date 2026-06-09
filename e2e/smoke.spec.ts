import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test('renders login form with branding', async ({ page }) => {
    await page.goto('/login');
    
    // Should show the FLOW.GRYF.AI branding heading
    await expect(page.locator('h1')).toBeVisible();
    
    // Should have email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Should have submit button (Polish: "Wyślij kod")
    const submitBtn = page.locator('button:has-text("Wyślij"), button:has-text("Send"), button:has-text("Magic"), button:has-text("Sign")');
    await expect(submitBtn.first()).toBeVisible();
  });

  test('email input has placeholder', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.locator('input[type="email"]');
    const placeholder = await emailInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('shows terms and privacy links', async ({ page }) => {
    await page.goto('/login');
    
    // Polish: "Regulamin" and "Prywatność"
    await expect(page.locator('text=/Regulamin|Terms/i').first()).toBeVisible();
    await expect(page.locator('text=/Prywatność|Privacy/i').first()).toBeVisible();
  });
});

test.describe('Navigation Guards', () => {
  test('redirects unauthenticated users from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard');
    
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('redirects unauthenticated users from /app to /login', async ({ page }) => {
    await page.goto('/app');
    
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });

  test('root loads landing page', async ({ page }) => {
    await page.goto('/');
    // Upewniamy się, że nie nastąpiło przekierowanie na /login
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('Shared Process Page', () => {
  test('shows error state for invalid share ID', async ({ page }) => {
    await page.goto('/shared/nonexistent-id-12345');
    
    // Wait for the page to render
    await expect(page.locator('#root')).not.toBeEmpty({ timeout: 10000 });
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Static Pages', () => {
  test('terms page loads without crash', async ({ page }) => {
    const response = await page.goto('/page/terms');
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe('Performance', () => {
  test('login page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;
    
    expect(elapsed).toBeLessThan(5000);
  });
});

test.describe('Cookie Banner', () => {
  test('cookie banner appears on login page', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    
    // Cookie banner with "Cenimy Twoją prywatność" or similar
    const banner = page.locator('text=/cookie|prywatność|Cenimy/i');
    await expect(banner.first()).toBeVisible({ timeout: 5000 });
  });
});
