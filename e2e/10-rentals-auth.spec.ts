import { test, expect } from './fixtures';
import { login } from './helpers/auth';

test.describe('Rentals Route Auth', () => {
  test('redirects unauthenticated users from /rentals to /login', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/rentals');
    await page.waitForURL('/login', { timeout: 5000 });

    await expect(page).toHaveURL('/login');
  });

  test('allows authenticated users to load /rentals', async ({ page }) => {
    await login(page);

    await page.goto('/rentals');

    await expect(page).toHaveURL('/rentals');
    await expect(page.getByRole('heading', { name: /rentals/i, level: 2 })).toBeVisible();
  });
});
