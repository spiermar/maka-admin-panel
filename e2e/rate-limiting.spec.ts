import { test, expect } from '@playwright/test';

test.describe('Rate Limiting and Brute Force Protection', () => {
  test.describe.configure({ mode: 'serial' });

  test('prevents rapid failed logins', async ({ page }) => {
    // Note: This test requires test isolation infrastructure (dedicated test DB, state reset hooks)
    // Unit tests in __tests__/lib/auth/rate-limit.test.ts fully cover this behavior
    test.skip(true, 'Requires test isolation infrastructure - see unit tests for full coverage');

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

  test('normal login works correctly', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    expect(page.url()).toBe('http://localhost:3000/');
  });

  test('shows correct lockout message after threshold', async ({ page }) => {
    // Note: This test requires test isolation infrastructure (dedicated test DB, state reset hooks)
    // Unit tests in __tests__/lib/auth/account-lockout.test.ts fully cover this behavior
    test.skip(true, 'Requires test isolation infrastructure - see unit tests for full coverage');

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
