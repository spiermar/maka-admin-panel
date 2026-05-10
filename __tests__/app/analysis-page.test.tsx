import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AnalysisPage from '@/app/(dashboard)/analysis/page';
import { getTransactionAnalysis } from '@/lib/analytics/transaction-analysis';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { getLangFromUrl } from '@/lib/i18n/utils';
import type { AnalysisFilterSearchParams } from '@/lib/analysis/filters';
import type { TransactionAnalysisData } from '@/lib/analytics/transaction-analysis';
import type { Account, CategoryWithPath } from '@/lib/db/types';

vi.mock('@/app/(dashboard)/analysis/client', () => ({
  AnalysisClient: vi.fn(() => null),
}));

vi.mock('@/lib/analytics/transaction-analysis', () => ({
  getTransactionAnalysis: vi.fn(),
}));

vi.mock('@/lib/db/accounts', () => ({
  getAllAccounts: vi.fn(),
}));

vi.mock('@/lib/db/categories', () => ({
  getAllCategoriesWithPaths: vi.fn(),
}));

vi.mock('@/lib/i18n/utils', () => ({
  getLangFromUrl: vi.fn(),
}));

const accounts: Account[] = [
  { id: 1, name: 'Checking', created_at: new Date('2026-01-01') },
];

const categories: CategoryWithPath[] = [
  {
    id: 7,
    name: 'Rent',
    parent_id: null,
    category_type: 'expense',
    depth: 1,
    created_at: new Date('2026-01-01'),
    path: 'Rent',
  },
];

const data: TransactionAnalysisData = {
  summary: { income: '0.00', expenses: '0.00' },
  incomeExpenseTrend: [],
  expenseBreakdown: [],
  incomeBreakdown: [],
  expenseStackedTrend: [],
  incomeStackedTrend: [],
  categoryTrends: [],
};

async function renderPage(searchParams: AnalysisFilterSearchParams) {
  return AnalysisPage({ searchParams: Promise.resolve(searchParams) });
}

describe('AnalysisPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));
    vi.clearAllMocks();
    vi.mocked(getAllAccounts).mockResolvedValue(accounts);
    vi.mocked(getAllCategoriesWithPaths).mockResolvedValue(categories);
    vi.mocked(getLangFromUrl).mockResolvedValue('en');
    vi.mocked(getTransactionAnalysis).mockResolvedValue(data);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores invalid-only category filters instead of restricting analysis', async () => {
    const page = await renderPage({ categories: '999999' });

    expect(getTransactionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCategoryFilter: false,
        includedCategoryIds: [],
      })
    );
    expect(page).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({
          filters: expect.objectContaining({
            hasCategoryFilter: false,
            includedCategoryIds: [],
          }),
        }),
      })
    );
  });

  it('keeps valid category IDs from mixed valid and invalid category filters', async () => {
    await renderPage({ categories: '7,999999' });

    expect(getTransactionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCategoryFilter: true,
        includedCategoryIds: [7],
      })
    );
  });

  it('preserves an explicit empty category selection', async () => {
    await renderPage({ categories: '' });

    expect(getTransactionAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        hasCategoryFilter: true,
        includedCategoryIds: [],
      })
    );
  });
});
