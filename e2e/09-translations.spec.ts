import { test, expect } from './fixtures';
import { login } from './helpers/auth';

/**
 * Translation End-to-End Tests
 *
 * Tests the i18n feature including:
 * - Translation via query parameter
 * - Default English locale
 * - Portuguese (pt-BR) translation
 */

test.describe('Translations', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('uses English by default when no lang param is provided', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText('Total Balance')).toBeVisible();
    await expect(page.getByText('Monthly Income')).toBeVisible();
    await expect(page.getByText('Monthly Expenses')).toBeVisible();
  });

  test('displays Portuguese translations when lang=pt-BR is provided', async ({ page }) => {
    await page.goto('/?lang=pt-BR');
    
    await expect(page.getByRole('heading', { name: /painel/i })).toBeVisible();
    await expect(page.getByText('Saldo Total')).toBeVisible();
    await expect(page.getByText('Receita Mensal')).toBeVisible();
    await expect(page.getByText('Despesas Mensais')).toBeVisible();
  });

  test('displays English translations when lang=en is explicitly provided', async ({ page }) => {
    await page.goto('/?lang=en');
    
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText('Total Balance')).toBeVisible();
  });

  test('maintains Portuguese locale when navigating to accounts page', async ({ page }) => {
    await page.goto('/?lang=pt-BR');

    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.find((cookie) => cookie.name === 'locale')?.value;
      })
      .toBe('pt-BR');

    await page.goto('/accounts');
    await page.waitForURL(/.*\/accounts/);

    expect(new URL(page.url()).searchParams.get('lang')).toBeNull();
    await expect(page.getByRole('heading', { name: /contas/i })).toBeVisible();

    await expect(page.getByRole('link', { name: /configurações/i })).toHaveAttribute(
      'href',
      '/settings?lang=pt-BR'
    );
  });

  test('maintains Portuguese locale when navigating to settings page', async ({ page }) => {
    await page.goto('/?lang=pt-BR');

    await expect
      .poll(async () => {
        const cookies = await page.context().cookies();
        return cookies.find((cookie) => cookie.name === 'locale')?.value;
      })
      .toBe('pt-BR');

    await page.goto('/settings');
    await page.waitForURL(/.*\/settings/);

    expect(new URL(page.url()).searchParams.get('lang')).toBeNull();
    await expect(page.getByRole('heading', { name: /configurações/i })).toBeVisible();
  });

  test.describe('Authenticated pages', () => {
    test('displays Portuguese translations on dashboard when lang=pt-BR', async ({ page }) => {
      await page.goto('/?lang=pt-BR');
      
      await expect(page.getByRole('heading', { name: /painel/i })).toBeVisible();
      await expect(page.getByText('Saldo Total')).toBeVisible();
      await expect(page.getByText('Fluxo de Caixa Líquido')).toBeVisible();
    });

    test('displays Portuguese translations on accounts page when lang=pt-BR', async ({ page }) => {
      await page.goto('/accounts?lang=pt-BR');
      
      await expect(page.getByRole('heading', { name: /contas/i })).toBeVisible();
    });

    test('displays Portuguese translations on settings page when lang=pt-BR', async ({ page }) => {
      await page.goto('/settings?lang=pt-BR');
      
      await expect(page.getByRole('heading', { name: /configurações/i })).toBeVisible();
    });
  });

  test.describe('Login page', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().clearCookies();
    });

    test('displays Portuguese translations on login page when lang=pt-BR', async ({ page }) => {
      await page.goto('/login?lang=pt-BR');
      
      await expect(page.getByRole('heading', { name: /console de gerenciamento/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
      await expect(page.getByLabel(/usuário/i)).toBeVisible();
      await expect(page.getByLabel(/senha/i)).toBeVisible();
    });

    test('displays English translations on login page when lang=en', async ({ page }) => {
      await page.goto('/login?lang=en');
      
      await expect(page.getByRole('heading', { name: /Management Console/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/username/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });
  });

  test.describe('Invalid locale handling', () => {
    test('falls back to English when invalid lang param is provided', async ({ page }) => {
      await page.goto('/?lang=fr');
      
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
      await expect(page.getByText('Total Balance')).toBeVisible();
    });

    test.describe('Login page', () => {
      test.beforeEach(async ({ page }) => {
        await page.context().clearCookies();
      });

      test('falls back to English when invalid locale is provided on login', async ({ page }) => {
        await page.goto('/login?lang=invalid');
        
        await expect(page.getByRole('heading', { name: /Management Console/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      });
    });
  });
});
