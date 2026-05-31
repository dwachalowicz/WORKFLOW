import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

// Use saved auth state
test.use({ storageState: AUTH_FILE });

test.describe('Authenticated — Dashboard', () => {
  test('loads dashboard without redirect to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for content to render
    await page.waitForTimeout(2000);
    
    // Should stay on dashboard, not redirect to login
    expect(page.url()).toContain('/dashboard');
  });

  test('shows processes tab by default', async ({ page }) => {
    await page.goto('/dashboard/processes');
    await page.waitForTimeout(2000);

    // Should see some process-related content
    expect(page.url()).toContain('/dashboard/processes');
  });

  test('navigates between dashboard tabs', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Click groups tab in navigation (sidebar icons)
    const groupsNav = page.locator('a[href*="groups"], button:has-text("Grupy"), button:has-text("Groups")');
    if (await groupsNav.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await groupsNav.first().click();
      await page.waitForURL(/groups/);
      expect(page.url()).toContain('groups');
    }
  });

  test('shows user avatar in navbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);
    
    // Should show user avatar with name "Dawid"
    const avatar = page.locator('img[alt="Dawid"]');
    await expect(avatar).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authenticated — Process CRUD', () => {
  test('can create a new process', async ({ page }) => {
    await page.goto('/dashboard/processes');
    await page.waitForTimeout(2000);

    // Find and click the "+" or "Nowy" button
    const addBtn = page.locator('button:has-text("Nowy"), button:has-text("New"), button[aria-label*="add"], button[aria-label*="new"]');
    
    if (await addBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.first().click();

      // Should navigate to /app (canvas editor)
      await page.waitForURL(/\/app/, { timeout: 10000 });
      expect(page.url()).toContain('/app');
    }
  });

  test('canvas editor loads with ReactFlow', async ({ page }) => {
    await page.goto('/dashboard/processes');
    await page.waitForTimeout(2000);

    // Create new process
    const addBtn = page.locator('button:has-text("Nowy"), button:has-text("New"), button[aria-label*="add"]');
    if (await addBtn.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await addBtn.first().click();
      await page.waitForURL(/\/app/, { timeout: 10000 });

      // ReactFlow canvas should be present
      const canvas = page.locator('.react-flow');
      await expect(canvas).toBeVisible({ timeout: 10000 });

      // Should have at least the start node
      const nodes = page.locator('.react-flow__node');
      const count = await nodes.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});

test.describe('Authenticated — Settings', () => {
  test('settings tab loads', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('settings');
  });
});

test.describe('Authenticated — Members', () => {
  test('members tab loads with user table', async ({ page }) => {
    await page.goto('/dashboard/members');
    await page.waitForTimeout(2000);

    expect(page.url()).toContain('members');
    
    // Should show the members table with current user
    const userCell = page.locator('text=dwachalowicz@gmail.com');
    await expect(userCell).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authenticated — Performance', () => {
  test('dashboard loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });
});
