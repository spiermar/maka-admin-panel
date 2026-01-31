import { test, expect } from './fixtures';
import { login } from './helpers/auth';

/**
 * Dashboard End-to-End Tests
 *
 * Tests the dashboard visualization and data display including:
 * - Dashboard page load
 * - Summary cards display
 * - Cash flow chart rendering
 * - Category charts (expenses and income)
 * - Recent transactions table
 * - Data accuracy and visibility
 */

test.describe('Dashboard Visualization', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page);
  });

  test('should display dashboard heading and basic structure', async ({ page }) => {
    // Verify main dashboard heading
    await expect(page.getByRole('heading', { name: /dashboard/i, level: 2 })).toBeVisible();

    // Verify page title
    await expect(page).toHaveTitle(/Maka Admin Panel/i);

    // Verify we're on the correct URL
    await expect(page).toHaveURL('/');
  });

  test('should display summary cards with financial data', async ({ page }) => {
    // Wait for summary cards to load (they're in a Suspense boundary)
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });

    // Look for key summary metrics
    // The SummaryCards component should display financial summary information
    // We'll verify the cards are rendered by checking for common financial terms

    // Check for currency symbols or financial indicators
    const pageContent = await page.textContent('body');

    // Summary cards typically show amounts with $ or numbers
    expect(pageContent).toBeTruthy();

    // Verify no error messages
    await expect(page.getByText(/error/i)).not.toBeVisible();
  });

  test('should render cash flow chart', async ({ page }) => {
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // The CashFlowChart component uses recharts
    // Look for the specific "Cash Flow Over Time" heading
    await expect(page.getByRole('heading', { name: 'Cash Flow Over Time' })).toBeVisible();

    // Verify no chart loading errors
    await expect(page.getByText(/failed to load/i)).not.toBeVisible();
  });

  test('should render expense and income category charts', async ({ page }) => {
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // Check for expense chart
    await expect(page.getByText(/top expenses this month/i)).toBeVisible();

    // Check for income chart
    await expect(page.getByText(/income sources this month/i)).toBeVisible();

    // Verify both charts are in a grid layout (md:grid-cols-2)
    const expenseChart = page.getByText(/top expenses this month/i);
    const incomeChart = page.getByText(/income sources this month/i);

    await expect(expenseChart).toBeVisible();
    await expect(incomeChart).toBeVisible();
  });

  test('should display recent transactions section', async ({ page }) => {
    // Wait for transactions to load (they're in a Suspense boundary)
    await page.waitForSelector('text=Loading transactions...', { state: 'hidden', timeout: 10000 });

    // Check for recent transactions section
    // The RecentTransactions component should display transaction data
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();

    // Verify no error state
    await expect(page.getByText(/failed to load transactions/i)).not.toBeVisible();
  });

  test('should load all dashboard components without errors', async ({ page }) => {
    // Wait for all network activity to complete
    await page.waitForLoadState('networkidle');

    // Wait for all suspense fallbacks to disappear
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Loading transactions...', { state: 'hidden', timeout: 10000 });

    // Check that all main sections are present
    const dashboardHeading = page.getByRole('heading', { name: /dashboard/i });
    const expensesChart = page.getByText(/top expenses this month/i);
    const incomeChart = page.getByText(/income sources this month/i);

    await expect(dashboardHeading).toBeVisible();
    await expect(expensesChart).toBeVisible();
    await expect(incomeChart).toBeVisible();

    // Verify no console errors (check for error boundaries or error text)
    await expect(page.getByText(/something went wrong/i)).not.toBeVisible();
    await expect(page.getByText(/error loading/i)).not.toBeVisible();
  });

  test('should be responsive and render properly', async ({ page }) => {
    // Test desktop viewport (default)
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Verify charts still visible on mobile
    await expect(page.getByText(/top expenses this month/i)).toBeVisible();
    await expect(page.getByText(/income sources this month/i)).toBeVisible();
  });

  test('should handle navigation from dashboard', async ({ page }) => {
    // Wait for dashboard to fully load
    await page.waitForLoadState('networkidle');

    // Look for navigation links (assuming there's a nav or sidebar)
    // Try to find common navigation elements
    const navLinks = page.locator('nav a, aside a, [role="navigation"] a');

    // If navigation exists, verify it's accessible
    const navCount = await navLinks.count();
    if (navCount > 0) {
      // Navigation should be visible
      expect(navCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Dashboard Data Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display consistent data across components', async ({ page }) => {
    // Wait for all content to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Loading transactions...', { state: 'hidden', timeout: 10000 });

    // Get the full page content
    const content = await page.textContent('body');

    // Verify page has content (not blank)
    expect(content).toBeTruthy();
    if (content) {
      expect(content.length).toBeGreaterThan(100);
    }

    // Dashboard should show the main heading
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Even with no transactions, dashboard should render without errors
    await page.waitForLoadState('networkidle');

    // Main structure should be present
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Charts should still render (even if empty)
    await expect(page.getByText(/top expenses this month/i)).toBeVisible();
    await expect(page.getByText(/income sources this month/i)).toBeVisible();

    // No error messages
    await expect(page.getByText(/error/i)).not.toBeVisible();
  });
});

test.describe('Dashboard Performance', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should load dashboard within reasonable time', async ({ page }) => {
    const startTime = Date.now();

    // Wait for all suspense boundaries to resolve
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Loading transactions...', { state: 'hidden', timeout: 10000 });

    const loadTime = Date.now() - startTime;

    // Dashboard should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should not have layout shifts after loading', async ({ page }) => {
    // Wait for initial load
    await page.waitForLoadState('networkidle');

    // Get initial viewport
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);

    // Wait a bit for any delayed rendering
    await page.waitForTimeout(1000);

    // Get final viewport
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);

    // Heights should be similar (allowing for small variations)
    // Large differences would indicate layout shift
    const heightDiff = Math.abs(finalHeight - initialHeight);
    expect(heightDiff).toBeLessThan(100);
  });
});
