import { test, expect } from '@playwright/test';

test.describe('Rate Limiting and Brute Force Protection', () => {
  test('normal login works correctly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('prevents rapid failed logins', async ({ page }) => {
    await page.goto('/login');

    for (let i = 0; i < 6; i++) {
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', `wrong${i}`);
      await page.click('button[type="submit"]');
      
      if (i < 5) {
        await expect(page.locator('text=Invalid')).toBeVisible();
      }
    }

    await expect(page.locator('text=Too many')).toBeVisible();
  });

  test('shows correct lockout message after threshold', async ({ page }) => {
    await page.goto('/login');

    for (let i = 0; i < 15; i++) {
      await page.fill('input[name="username"]', 'admin');
      await page.fill('input[name="password"]', `wrong${i}`);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=locked')).toBeVisible();
  });
});
