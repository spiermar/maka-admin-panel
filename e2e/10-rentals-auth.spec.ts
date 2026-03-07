import { test, expect } from './fixtures';
import { login } from './helpers/auth';

test.describe('Rentals Route Auth', () => {
  test('redirects unauthenticated users from /rentals to /login', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/rentals?lang=en');
    await page.waitForURL('**/login', { timeout: 5000 });

    await expect(page).toHaveURL('/login');
    await expect(page.getByLabel(/username/i)).toBeVisible();

    const redirectedUrl = new URL(page.url());
    await expect(redirectedUrl.pathname).toBe('/login');
    await expect(page.getByRole('heading', { name: /rentals/i, level: 2 })).not.toBeVisible();
  });

  test('allows authenticated users to load /rentals', async ({ page }) => {
    await login(page);

    await expect(page).not.toHaveURL('/login');

    await page.goto('/rentals?lang=en');
    await page.waitForURL('/rentals?lang=en', { timeout: 10000 });

    await expect(page).toHaveURL('/rentals?lang=en');
    await expect(page.getByRole('heading', { name: /rentals/i, level: 2 })).toBeVisible();

    const rentalsUrl = new URL(page.url());
    await expect(rentalsUrl.pathname).toBe('/rentals');
    await expect(rentalsUrl.searchParams.get('lang')).toBe('en');
    await expect(page.getByLabel(/username/i)).not.toBeVisible();
  });
});
