import { Page } from '@playwright/test';

/**
 * Test Helpers for Authentication
 *
 * Reusable functions for common authentication operations in E2E tests.
 */

export interface LoginCredentials {
  username: string;
  password: string;
}

/**
 * Default test credentials
 */
export const DEFAULT_CREDENTIALS: LoginCredentials = {
  username: 'admin',
  password: 'admin123',
};

/**
 * Login helper function
 *
 * Navigates to login page, fills credentials, and submits the form.
 * Waits for successful navigation to dashboard.
 *
 * @param page - Playwright Page object
 * @param credentials - Optional custom credentials (defaults to admin/admin123)
 */
export async function login(
  page: Page,
  credentials: LoginCredentials = DEFAULT_CREDENTIALS
): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.getByLabel(/username/i).fill(credentials.username);
  await page.getByLabel(/password/i).fill(credentials.password);

  // Submit form
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 10000 });
}

/**
 * Logout helper function
 *
 * Clicks the logout button and waits for redirect to login page.
 *
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  // Look for logout button (adjust selector based on your UI)
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });

  // Click logout if button exists
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForURL('/login', { timeout: 5000 });
  }
}

/**
 * Check if user is logged in
 *
 * Attempts to navigate to a protected route and checks if redirected to login.
 *
 * @param page - Playwright Page object
 * @returns boolean indicating if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto('/');

  // Wait for navigation to settle
  await page.waitForLoadState('networkidle');

  // Check current URL
  const currentUrl = page.url();

  // If we're on login page, user is not logged in
  return !currentUrl.includes('/login');
}

/**
 * Setup authenticated session
 *
 * Creates an authenticated session by logging in.
 * Useful for test setup when you don't want to test the login flow.
 *
 * @param page - Playwright Page object
 * @param credentials - Optional custom credentials
 */
export async function setupAuthenticatedSession(
  page: Page,
  credentials: LoginCredentials = DEFAULT_CREDENTIALS
): Promise<void> {
  await login(page, credentials);

  // Verify we're logged in
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    throw new Error('Failed to setup authenticated session');
  }
}

/**
 * Clear session
 *
 * Clears all cookies to remove authentication.
 * Useful for testing unauthenticated scenarios.
 *
 * @param page - Playwright Page object
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}
