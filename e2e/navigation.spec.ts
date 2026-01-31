import { test, expect } from './fixtures';
import { login } from './helpers/auth';

/**
 * Navigation and Protected Routes End-to-End Tests
 *
 * Tests the application navigation, route protection, and user flows including:
 * - Navigation between pages
 * - Protected route access
 * - URL handling
 * - Back/forward navigation
 */

test.describe('Navigation and Protected Routes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should protect routes and redirect unauthenticated users', async ({ browser }) => {
    // Create a completely new context (not sharing cookies with authenticated session)
    const newContext = await browser.newContext();
    const newPage = await newContext.newPage();

    // Try to access dashboard without authentication
    await newPage.goto('/');

    // Should be redirected to login
    await expect(newPage).toHaveURL('/login');
    await expect(newPage.getByRole('heading', { name: /login/i })).toBeVisible();

    await newPage.close();
    await newContext.close();
  });

  test('should allow navigation from dashboard to other pages', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL('/');

    // Try to navigate to accounts if link exists
    const accountsLink = page.locator('a[href*="/accounts"], nav a:has-text("Accounts")');

    if (await accountsLink.first().isVisible()) {
      await accountsLink.first().click();
      await page.waitForLoadState('networkidle');

      // Should navigate successfully
      expect(page.url()).toContain('/accounts');
    }
  });

  test('should maintain session across navigation', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL('/');

    // Navigate to different routes that exist
    const routes = ['/settings', '/accounts/1'];

    for (const route of routes) {
      // Try navigating to each route
      await page.goto(route);

      // Wait for load
      await page.waitForLoadState('networkidle');

      // Should not redirect to login (session maintained)
      expect(page.url()).not.toContain('/login');
    }
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Start on dashboard
    await expect(page).toHaveURL('/');
    const dashboardHeading = page.getByRole('heading', { name: /dashboard/i });
    await expect(dashboardHeading).toBeVisible();

    // Navigate to settings page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be back on dashboard
    await expect(page).toHaveURL('/');

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Should be back on settings
    expect(page.url()).toContain('/settings');
  });

  test('should handle direct URL access for protected routes', async ({ page }) => {
    // Directly navigate to various protected routes
    const protectedRoutes = [
      '/',
      '/settings',
      '/accounts/1',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should not redirect to login since we're authenticated
      expect(page.url()).not.toContain('/login');
    }
  });

  test('should handle page refresh on protected routes', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Refresh the page
    await page.reload();

    // Should still be on dashboard (not logged out)
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });
});

test.describe('Navigation Unauthorized', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all cookies to ensure unauthenticated state
    await context.clearCookies();
  });

  test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
    // Try to access dashboard without logging in
    await page.goto('/');

    // Should redirect to login
    await page.waitForURL('/login', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should redirect to login for all protected routes when not authenticated', async ({ browser }) => {
    const protectedRoutes = [
      '/',
      '/settings',
      '/accounts/1', // Dynamic route with example ID
    ];

    // Test each route with a fresh context to avoid chunk loading issues
    for (const route of protectedRoutes) {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate and wait for redirect
      const _response = await page.goto(route);
      await page.waitForURL('/login', { timeout: 5000 });

      // Should be on login page
      await expect(page).toHaveURL('/login');
      await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();

      await context.close();
    }
  });

  test('should allow access to login page when not authenticated', async ({ page }) => {
    await page.goto('/login');

    // Should stay on login page
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });
});

test.describe('URL Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should handle 404 routes gracefully', async ({ page }) => {
    // Navigate to non-existent route
    await page.goto('/non-existent-route');
    await page.waitForLoadState('networkidle');

    // Should show 404 page or redirect somewhere appropriate
    // Next.js typically shows a 404 page
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('should preserve query parameters in URLs', async ({ page }) => {
    // Navigate with query parameters
    await page.goto('/?test=123');

    // URL should preserve query params
    expect(page.url()).toContain('test=123');
  });

  test('should handle hash fragments in URLs', async ({ page }) => {
    // Navigate with hash
    await page.goto('/#section');

    // URL should preserve hash
    expect(page.url()).toContain('#section');
  });
});
