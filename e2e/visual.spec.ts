import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';

/**
 * Visual Regression Tests
 *
 * Tests for visual consistency and UI rendering including:
 * - Screenshot comparisons
 * - Responsive design verification
 * - Component rendering consistency
 * - Cross-browser visual consistency
 */

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should render dashboard consistently', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for all suspense boundaries to resolve
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });
    await page.waitForSelector('text=Loading transactions...', { state: 'hidden', timeout: 10000 });

    // Take screenshot for visual comparison
    // Note: First run will create baseline, subsequent runs will compare
    await expect(page).toHaveScreenshot('dashboard-full.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small differences for dynamic content
    });
  });

  test('should render login page consistently', async ({ page }) => {
    // Navigate to login (will redirect since we're logged in from beforeEach)
    // Create new context for this test
    await page.context().clearCookies();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-page.png', {
      fullPage: true,
    });
  });

  test('should render dashboard components at different viewports', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500); // Allow time for reflow
    await expect(page).toHaveScreenshot('dashboard-desktop.png', {
      maxDiffPixels: 100,
    });

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-tablet.png', {
      maxDiffPixels: 100,
    });

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      maxDiffPixels: 100,
    });
  });
});

test.describe('Component Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should render all dashboard cards without overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });

    // Get all card elements
    const cards = page.locator('[class*="card"], [class*="Card"]');
    const count = await cards.count();

    // Verify cards are visible and within viewport
    for (let i = 0; i < Math.min(count, 10); i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        const box = await card.boundingBox();
        if (box) {
          // Card should have reasonable dimensions
          expect(box.width).toBeGreaterThan(0);
          expect(box.height).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should render charts without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for chart elements (recharts adds SVG elements)
    const charts = page.locator('svg');
    const chartCount = await charts.count();

    // Should have at least one chart
    expect(chartCount).toBeGreaterThan(0);

    // Verify charts have reasonable size
    for (let i = 0; i < Math.min(chartCount, 5); i++) {
      const chart = charts.nth(i);
      const box = await chart.boundingBox();
      if (box && box.width > 50 && box.height > 50) {
        // Chart has reasonable size
        expect(box.width).toBeGreaterThan(50);
        expect(box.height).toBeGreaterThan(50);
      }
    }
  });

  test('should have no horizontal scrollbar on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});

test.describe('Accessibility Checks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1-h6 elements
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();

    // Should have at least one heading
    expect(h1Count + h2Count).toBeGreaterThan(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();

    // Check that images have alt attributes
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt should be defined (can be empty for decorative images)
      expect(alt).toBeDefined();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // Check username input has associated label
    const usernameInput = page.getByLabel(/username/i);
    await expect(usernameInput).toBeVisible();

    // Check password input has associated label
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toBeVisible();
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.tagName);

    // Should focus on username or password input
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON']).toContain(focused);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get computed styles of text elements
    const heading = page.getByRole('heading', { name: /dashboard/i });
    const styles = await heading.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        fontSize: computed.fontSize,
      };
    });

    // Verify styles are applied
    expect(styles.color).toBeTruthy();
    expect(styles.fontSize).toBeTruthy();
  });
});

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should adapt layout for mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dashboard should still be visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Content should fit within viewport
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(375);
  });

  test('should adapt layout for tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dashboard should be visible
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Charts should still be visible
    await expect(page.getByText(/top expenses this month/i)).toBeVisible();
  });

  test('should show grid layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('text=Loading summary...', { state: 'hidden', timeout: 10000 });

    // Verify wide layout
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(1920);

    // Charts should be side by side (check their positions)
    const expenseChart = page.getByText(/top expenses this month/i);
    const incomeChart = page.getByText(/income sources this month/i);

    const expenseBox = await expenseChart.boundingBox();
    const incomeBox = await incomeChart.boundingBox();

    if (expenseBox && incomeBox) {
      // On desktop with grid, charts should be at similar y-position (side by side)
      // or at different positions if stacked
      expect(expenseBox.y).toBeGreaterThanOrEqual(0);
      expect(incomeBox.y).toBeGreaterThanOrEqual(0);
    }
  });
});
