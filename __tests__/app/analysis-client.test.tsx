import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisClient } from '@/app/(dashboard)/analysis/client';
import type { AnalysisFilters } from '@/lib/analysis/filters';
import type { TransactionAnalysisData } from '@/lib/analytics/transaction-analysis';
import type { Account, CategoryWithPath } from '@/lib/db/types';

vi.mock('@/components/analysis/analysis-summary-cards', () => ({
  AnalysisSummaryCards: ({
    labels,
  }: {
    labels: { income: string; expenses: string };
  }) => (
    <section data-testid="summary-cards">
      <h3>{labels.income}</h3>
      <h3>{labels.expenses}</h3>
    </section>
  ),
}));

vi.mock('@/components/analysis/income-expense-trend-chart', () => ({
  IncomeExpenseTrendChart: ({ title }: { title: string }) => (
    <section data-testid="income-expense-chart">{title}</section>
  ),
}));

vi.mock('@/components/analysis/category-stacked-trend-chart', () => ({
  CategoryStackedTrendChart: ({ title }: { title: string }) => (
    <section data-testid="stacked-trend-chart">{title}</section>
  ),
}));

vi.mock('@/components/analysis/category-breakdown-chart', () => ({
  CategoryBreakdownChart: ({ title }: { title: string }) => (
    <section data-testid="breakdown-chart">{title}</section>
  ),
}));

vi.mock('@/components/analysis/category-trend-table', () => ({
  CategoryTrendTable: ({ title }: { title: string }) => (
    <section data-testid="trend-table">{title}</section>
  ),
}));

const messages = {
  analysis: {
    title: 'Analysis',
    description: 'Explore income and expense trends.',
    filters: 'Filters',
    dateRangePreset: 'Date range',
    from: 'From',
    to: 'To',
    account: 'Account',
    allAccounts: 'All accounts',
    grouping: 'Grouping',
    resetFilters: 'Reset',
    invalidDateRange: 'From date must be before to date.',
    presets: {
      thisMonth: 'This month',
      lastMonth: 'Last month',
      last3Months: 'Last 3 months',
      last90Days: 'Last 90 days',
      thisYear: 'This year',
      ytd: 'Year to date',
      lastYear: 'Last year',
      custom: 'Custom',
    },
    groupings: {
      adaptive: 'Adaptive',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    },
    categories: {
      title: 'Categories',
      income: 'Income categories',
      expense: 'Expense categories',
      uncategorizedIncome: 'Uncategorized income',
      uncategorizedExpense: 'Uncategorized expense',
    },
    summary: {
      income: 'Income',
      expenses: 'Expenses',
    },
    charts: {
      incomeExpenseTrend: 'Income-expense chart',
      incomeStackedTrend: 'Income category trend',
      expenseStackedTrend: 'Expense category trend',
      incomeBreakdown: 'Income breakdown',
      expenseBreakdown: 'Expense breakdown',
      categoryTrendTable: 'Trend table',
      empty: 'No data',
    },
    table: {
      category: 'Category',
      type: 'Type',
      total: 'Total',
      income: 'Income',
      expense: 'Expense',
    },
  },
};

describe('AnalysisClient', () => {
  let routerPush: ReturnType<typeof vi.fn>;

  const accounts: Account[] = [
    { id: 1, name: 'Checking Account', created_at: new Date('2026-01-01') },
    { id: 2, name: 'Savings Account', created_at: new Date('2026-01-01') },
  ];

  const categories: CategoryWithPath[] = [
    {
      id: 10,
      name: 'Salary',
      parent_id: null,
      category_type: 'income',
      depth: 1,
      created_at: new Date('2026-01-01'),
      path: 'Salary',
    },
    {
      id: 20,
      name: 'Rent',
      parent_id: null,
      category_type: 'expense',
      depth: 1,
      created_at: new Date('2026-01-01'),
      path: 'Rent',
    },
  ];

  const filters: AnalysisFilters = {
    preset: 'last-3-months',
    from: '2026-02-10',
    to: '2026-05-10',
    grouping: 'adaptive',
    resolvedGrouping: 'monthly',
    includedCategoryIds: [],
    hasCategoryFilter: false,
    includeUncategorizedIncome: true,
    includeUncategorizedExpense: true,
    hasInvalidDateRange: false,
  };

  const data: TransactionAnalysisData = {
    summary: { income: '5000.00', expenses: '2200.00' },
    incomeExpenseTrend: [
      { period: '2026-04', income: '5000.00', expenses: '2200.00' },
    ],
    incomeBreakdown: [],
    expenseBreakdown: [],
    incomeStackedTrend: [],
    expenseStackedTrend: [],
    categoryTrends: [],
  };

  beforeEach(() => {
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.setPointerCapture ??= vi.fn();
    Element.prototype.releasePointerCapture ??= vi.fn();
    Element.prototype.scrollIntoView ??= vi.fn();
    routerPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: routerPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue('/analysis');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as ReturnType<typeof useSearchParams>
    );
  });

  function renderClient(nextFilters: AnalysisFilters = filters) {
    return render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AnalysisClient
          accounts={accounts}
          categories={categories}
          filters={nextFilters}
          data={data}
          lang="en"
        />
      </NextIntlClientProvider>
    );
  }

  async function selectOption(trigger: HTMLElement, name: string) {
    const user = userEvent.setup();
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name }));
  }

  it('renders the page sections', () => {
    renderClient();

    expect(screen.getByRole('heading', { name: 'Analysis' })).toBeInTheDocument();
    expect(screen.getByText('Explore income and expense trends.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Income' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Expenses' })).toBeInTheDocument();
    expect(screen.getByTestId('income-expense-chart')).toHaveTextContent(
      'Income-expense chart'
    );
    expect(screen.getByTestId('trend-table')).toHaveTextContent('Trend table');
  });

  it('pushes the selected account into the URL while preserving lang', async () => {
    renderClient();

    const filtersCard = screen.getByRole('heading', { name: 'Filters' }).closest('div')
      ?.parentElement;
    expect(filtersCard).not.toBeNull();
    const accountSelect = within(filtersCard as HTMLElement).getByRole('combobox', {
      name: 'Account',
    });

    await selectOption(accountSelect, 'Savings Account');

    const pushedUrl = routerPush.mock.calls.at(-1)?.[0] as string;
    const pushedParams = new URLSearchParams(pushedUrl.split('?')[1]);
    expect(pushedUrl.startsWith('/analysis?')).toBe(true);
    expect(pushedParams.get('accountId')).toBe('2');
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('resets filters to the analysis page with lang', async () => {
    const user = userEvent.setup();
    renderClient({ ...filters, accountId: 1 });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(routerPush).toHaveBeenCalledWith('/analysis?lang=en');
  });
});
