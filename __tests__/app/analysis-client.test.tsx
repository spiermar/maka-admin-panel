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
  IncomeExpenseTrendChart: ({
    data,
    labels,
    locale,
    title,
  }: {
    data: TransactionAnalysisData['incomeExpenseTrend'];
    labels: { income: string; expenses: string };
    locale: string;
    title: string;
  }) => (
    <section
      data-testid="income-expense-chart"
      data-locale={locale}
      data-points={data.length}
      data-income-label={labels.income}
      data-expenses-label={labels.expenses}
    >
      {title}
    </section>
  ),
}));

vi.mock('@/components/analysis/category-stacked-trend-chart', () => ({
  CategoryStackedTrendChart: ({
    data,
    locale,
    title,
  }: {
    data:
      | TransactionAnalysisData['incomeStackedTrend']
      | TransactionAnalysisData['expenseStackedTrend'];
    locale: string;
    title: string;
  }) => (
    <section
      data-testid="stacked-trend-chart"
      data-locale={locale}
      data-points={data.points.length}
    >
      {title}
    </section>
  ),
}));

vi.mock('@/components/analysis/category-breakdown-chart', () => ({
  CategoryBreakdownChart: ({
    color,
    data,
    locale,
    title,
  }: {
    color: string;
    data:
      | TransactionAnalysisData['incomeBreakdown']
      | TransactionAnalysisData['expenseBreakdown'];
    locale: string;
    title: string;
  }) => (
    <section
      data-testid="breakdown-chart"
      data-color={color}
      data-locale={locale}
      data-points={data.length}
    >
      {title}
    </section>
  ),
}));

vi.mock('@/components/analysis/category-trend-table', () => ({
  CategoryTrendTable: ({
    labels,
    locale,
    periods,
    rows,
    title,
  }: {
    labels: { category: string; type: string; total: string };
    locale: string;
    periods: string[];
    rows: TransactionAnalysisData['categoryTrends'];
    title: string;
  }) => (
    <section
      data-testid="trend-table"
      data-category-label={labels.category}
      data-locale={locale}
      data-periods={periods.join('|')}
      data-rows={rows.length}
      data-total-label={labels.total}
      data-type-label={labels.type}
    >
      {title}
    </section>
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
      { period: '2026-05', income: '5200.00', expenses: '2100.00' },
      { period: '2026-04', income: '500.00', expenses: '200.00' },
    ],
    incomeBreakdown: [
      {
        category_id: 10,
        category_name: 'Salary',
        category_path: 'Salary',
        amount: '10200.00',
        percentage: 100,
      },
    ],
    expenseBreakdown: [
      {
        category_id: 20,
        category_name: 'Rent',
        category_path: 'Rent',
        amount: '4300.00',
        percentage: 100,
      },
    ],
    incomeStackedTrend: {
      series: [{ key: 'income-10', name: 'Salary' }],
      points: [{ period: '2026-04', values: { 'income-10': '5000.00' } }],
    },
    expenseStackedTrend: {
      series: [{ key: 'expense-20', name: 'Rent' }],
      points: [{ period: '2026-04', values: { 'expense-20': '2200.00' } }],
    },
    categoryTrends: [
      {
        categoryKey: 'income-10',
        categoryType: 'income',
        categoryPath: 'Salary',
        total: '10200.00',
        periods: { '2026-04': '5000.00', '2026-05': '5200.00' },
      },
    ],
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

  function setSearchParams(params: string) {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams(params) as ReturnType<typeof useSearchParams>
    );
  }

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

  function getPushedParams(callIndex = -1) {
    const pushedUrl = routerPush.mock.calls.at(callIndex)?.[0] as string;

    return {
      pushedUrl,
      pushedParams: new URLSearchParams(pushedUrl.split('?')[1]),
    };
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

  it('pushes both current dates when selecting the custom preset', async () => {
    renderClient();

    await selectOption(screen.getByRole('combobox', { name: 'Date range' }), 'Custom');

    const { pushedParams } = getPushedParams();
    expect(pushedParams.get('preset')).toBe('custom');
    expect(pushedParams.get('from')).toBe('2026-02-10');
    expect(pushedParams.get('to')).toBe('2026-05-10');
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('pushes both dates when editing one custom date input', async () => {
    const user = userEvent.setup();
    renderClient();

    await user.clear(screen.getByLabelText('From'));
    await user.type(screen.getByLabelText('From'), '2026-01-15');

    const { pushedParams } = getPushedParams();
    expect(pushedParams.get('preset')).toBe('custom');
    expect(pushedParams.get('from')).toBe('2026-01-15');
    expect(pushedParams.get('to')).toBe('2026-05-10');
  });

  it('preserves prior filter changes across quick successive URL updates', async () => {
    renderClient();

    await selectOption(screen.getByRole('combobox', { name: 'Account' }), 'Savings Account');
    await selectOption(screen.getByRole('combobox', { name: 'Grouping' }), 'Monthly');

    const { pushedParams } = getPushedParams();
    expect(pushedParams.get('accountId')).toBe('2');
    expect(pushedParams.get('grouping')).toBe('monthly');
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('does not reuse stale account filters after props reset to defaults', async () => {
    const { rerender } = renderClient({ ...filters, accountId: 2 });

    rerender(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AnalysisClient
          accounts={accounts}
          categories={categories}
          filters={filters}
          data={data}
          lang="en"
        />
      </NextIntlClientProvider>
    );

    await selectOption(screen.getByRole('combobox', { name: 'Grouping' }), 'Monthly');

    const { pushedParams } = getPushedParams();
    expect(pushedParams.has('accountId')).toBe(false);
    expect(pushedParams.get('grouping')).toBe('monthly');
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('clears category params when the selection returns to the default filter', async () => {
    const user = userEvent.setup();
    setSearchParams('lang=en&categories=10&uncategorizedIncome=0&uncategorizedExpense=0');
    renderClient({
      ...filters,
      includedCategoryIds: [10],
      hasCategoryFilter: true,
      includeUncategorizedIncome: false,
      includeUncategorizedExpense: false,
    });

    await user.click(screen.getByRole('checkbox', { name: 'Rent' }));
    await user.click(screen.getByRole('checkbox', { name: 'Uncategorized income' }));
    await user.click(screen.getByRole('checkbox', { name: 'Uncategorized expense' }));

    const { pushedParams } = getPushedParams();
    expect(pushedParams.has('categories')).toBe(false);
    expect(pushedParams.has('uncategorizedIncome')).toBe(false);
    expect(pushedParams.has('uncategorizedExpense')).toBe(false);
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('writes sorted category params and disabled uncategorized flags', async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole('checkbox', { name: 'Salary' }));
    await user.click(screen.getByRole('checkbox', { name: 'Uncategorized expense' }));

    const { pushedParams } = getPushedParams();
    expect(pushedParams.get('categories')).toBe('20');
    expect(pushedParams.has('uncategorizedIncome')).toBe(false);
    expect(pushedParams.get('uncategorizedExpense')).toBe('0');
    expect(pushedParams.get('lang')).toBe('en');
  });

  it('forwards chart props and derives table periods from income-expense trend data', () => {
    renderClient();

    expect(screen.getByTestId('income-expense-chart')).toHaveAttribute(
      'data-points',
      '3'
    );
    expect(screen.getByTestId('income-expense-chart')).toHaveAttribute(
      'data-income-label',
      'Income'
    );
    expect(screen.getByTestId('income-expense-chart')).toHaveAttribute(
      'data-expenses-label',
      'Expenses'
    );

    const stackedCharts = screen.getAllByTestId('stacked-trend-chart');
    expect(stackedCharts[0]).toHaveAttribute('data-points', '1');
    expect(stackedCharts[1]).toHaveAttribute('data-points', '1');

    const breakdownCharts = screen.getAllByTestId('breakdown-chart');
    expect(breakdownCharts[0]).toHaveAttribute('data-color', '#22c55e');
    expect(breakdownCharts[0]).toHaveAttribute('data-points', '1');
    expect(breakdownCharts[1]).toHaveAttribute('data-color', '#ef4444');
    expect(breakdownCharts[1]).toHaveAttribute('data-points', '1');

    expect(screen.getByTestId('trend-table')).toHaveAttribute(
      'data-periods',
      '2026-04|2026-05'
    );
    expect(screen.getByTestId('trend-table')).toHaveAttribute('data-rows', '1');
    expect(screen.getByTestId('trend-table')).toHaveAttribute(
      'data-category-label',
      'Category'
    );
    expect(screen.getByTestId('trend-table')).toHaveAttribute(
      'data-total-label',
      'Total'
    );
  });

  it('resets filters to the analysis page with lang', async () => {
    const user = userEvent.setup();
    renderClient({ ...filters, accountId: 1 });

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(routerPush).toHaveBeenCalledWith('/analysis?lang=en');
  });
});
