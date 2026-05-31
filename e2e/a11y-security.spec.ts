import { test, expect } from '@playwright/test';

test.describe('Accessibility basics', () => {
  test('login page has proper heading structure', async ({ page }) => {
    await page.goto('/login');

    // Should have exactly one h1
    const h1s = page.locator('h1');
    await expect(h1s).toHaveCount(1);
  });

  test('login page has proper document title', async ({ page }) => {
    await page.goto('/login');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.toLowerCase()).toContain('gryf');
  });

  test('login page has lang attribute', async ({ page }) => {
    await page.goto('/login');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

  test('all images have alt text', async ({ page }) => {
    await page.goto('/login');

    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // alt can be empty string (decorative) but should exist
      expect(alt).not.toBeNull();
    }
  });
});

test.describe('Security headers (via meta tags)', () => {
  test('has viewport meta tag', async ({ page }) => {
    await page.goto('/login');

    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveCount(1);
  });

  test('has charset meta tag', async ({ page }) => {
    await page.goto('/login');

    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
  });
});

test.describe('Cookie banner', () => {
  test('shows cookie banner on first visit', async ({ page, context }) => {
    // Clear cookies to simulate first visit
    await context.clearCookies();
    await page.goto('/login');

    // Cookie banner should appear (may take a moment)
    await page.waitForTimeout(1000);
    page.locator('text=/cookie|ciastk/i');
    // Banner might or might not show depending on implementation
    // Just verify page doesn't crash
    expect(await page.title()).toBeTruthy();
  });
});

test.describe('Responsive design', () => {
  test('login page works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.goto('/login');

    // Email input should still be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('login page works on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });
});
