import { test, expect } from './fixtures';
import { login } from './helpers/auth';

async function navigateToAnalysis(page: Parameters<typeof login>[0]) {
  await login(page);

  const analysisLink = page.getByRole('link', { name: /^analysis$/i }).first();
  await expect(analysisLink).toBeVisible();
  await analysisLink.click();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/analysis/);
}

test.describe('Transaction Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToAnalysis(page);
  });

  test('authenticated user can navigate to Analysis from the nav', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^analysis$/i })).toBeVisible();
    await expect(page.getByText(/explore income and expense trends/i)).toBeVisible();
  });

  test('default view shows major analysis sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^analysis$/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /income vs\.? expenses/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /expense categor(y|ies)( trend| over time)/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /income categor(y|ies)( trend| over time)/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /category trend table/i })
    ).toBeVisible();
  });

  test('grouping filter updates the URL', async ({ page }) => {
    await page.getByRole('combobox', { name: /grouping/i }).click();
    await page.getByRole('option', { name: /^monthly$/i }).click();

    await expect(page).toHaveURL(/grouping=monthly/);
    await expect(page.getByRole('heading', { name: /^analysis$/i })).toBeVisible();
  });

  test('date range filter updates the URL', async ({ page }) => {
    await page.getByRole('combobox', { name: /date range/i }).click();
    await page.getByRole('option', { name: /^last year$/i }).click();

    await expect(page).toHaveURL(/preset=last-year/);
    await expect(page.getByRole('heading', { name: /^analysis$/i })).toBeVisible();
  });

  test('category toggle keeps the page usable', async ({ page }) => {
    const uncategorizedIncome = page.getByLabel(/^uncategorized income$/i);

    await expect(uncategorizedIncome).toBeChecked();
    await uncategorizedIncome.click();

    await expect(uncategorizedIncome).not.toBeChecked();
    await expect(page).toHaveURL(/uncategorizedIncome=0/);
    await expect(page.getByRole('heading', { name: /^analysis$/i })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /income vs\.? expenses/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /category trend table/i })
    ).toBeVisible();
  });
});
