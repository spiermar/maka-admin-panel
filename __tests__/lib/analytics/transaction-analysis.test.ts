import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnalysisFilters } from '@/lib/analysis/filters';
import {
  buildAnalysisWhereClause,
  emptyTransactionAnalysis,
  getTransactionAnalysis,
  groupStackedTrendRows,
  periodExpression,
} from '@/lib/analytics/transaction-analysis';

vi.mock('@/lib/db', () => ({
  queryMany: vi.fn(),
  queryOne: vi.fn(),
}));

const baseFilters: AnalysisFilters = {
  preset: 'custom',
  from: '2025-01-01',
  to: '2025-03-31',
  grouping: 'monthly',
  resolvedGrouping: 'monthly',
  includedCategoryIds: [],
  hasCategoryFilter: false,
  includeUncategorizedIncome: true,
  includeUncategorizedExpense: true,
  hasInvalidDateRange: false,
};

describe('Transaction Analysis Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildAnalysisWhereClause', () => {
    it('parameterizes date, account, category ids, and uncategorized category filters', () => {
      const result = buildAnalysisWhereClause({
        ...baseFilters,
        accountId: 7,
        includedCategoryIds: [2, 5],
        hasCategoryFilter: true,
        includeUncategorizedIncome: true,
        includeUncategorizedExpense: false,
      });

      expect(result.params).toEqual([
        '2025-01-01',
        '2025-03-31',
        7,
        [2, 5],
      ]);
      expect(result.whereClause).toContain('t.date >= $1');
      expect(result.whereClause).toContain('t.date <= $2');
      expect(result.whereClause).toContain('t.account_id = $3');
      expect(result.whereClause).toContain('t.category_id = ANY($4::int[])');
      expect(result.whereClause).toContain('(t.category_id IS NULL AND t.amount > 0)');
      expect(result.whereClause).not.toContain('(t.category_id IS NULL AND t.amount < 0)');
    });

    it('uses FALSE when category filter excludes all categories and uncategorized transactions', () => {
      const result = buildAnalysisWhereClause({
        ...baseFilters,
        hasCategoryFilter: true,
        includeUncategorizedIncome: false,
        includeUncategorizedExpense: false,
      });

      expect(result.params).toEqual(['2025-01-01', '2025-03-31']);
      expect(result.whereClause).toContain('AND (FALSE)');
    });
  });

  describe('periodExpression', () => {
    it('returns the SQL expression for each supported grouping', () => {
      expect(periodExpression('daily')).toBe("TO_CHAR(t.date, 'YYYY-MM-DD')");
      expect(periodExpression('weekly')).toBe(
        "TO_CHAR(DATE_TRUNC('week', t.date), 'YYYY-MM-DD')"
      );
      expect(periodExpression('monthly')).toBe(
        "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')"
      );
    });
  });

  describe('groupStackedTrendRows', () => {
    it('keeps the top 10 full-range categories and folds the rest into Other', () => {
      const rows = Array.from({ length: 12 }, (_, index) => {
        const categoryNumber = index + 1;

        return {
          period: index % 2 === 0 ? '2025-01' : '2025-02',
          category_key: `expense-${categoryNumber}`,
          category_path: `Expense ${categoryNumber}`,
          amount: `${120 - categoryNumber}.00`,
        };
      });

      const result = groupStackedTrendRows(rows);

      expect(result).toEqual([
        {
          period: '2025-01',
          'Expense 1': '119.00',
          'Expense 3': '117.00',
          'Expense 5': '115.00',
          'Expense 7': '113.00',
          'Expense 9': '111.00',
          Other: '109.00',
        },
        {
          period: '2025-02',
          'Expense 2': '118.00',
          'Expense 4': '116.00',
          'Expense 6': '114.00',
          'Expense 8': '112.00',
          'Expense 10': '110.00',
          Other: '108.00',
        },
      ]);
    });

    it('selects tied top categories deterministically by category path', () => {
      const rows = [
        {
          period: '2025-01',
          category_key: 'expense-11',
          category_path: 'Category 11',
          amount: '100.00',
        },
        ...Array.from({ length: 10 }, (_, index) => {
          const categoryNumber = index + 1;

          return {
            period: '2025-01',
            category_key: `expense-${categoryNumber}`,
            category_path: `Category ${String(categoryNumber).padStart(2, '0')}`,
            amount: '100.00',
          };
        }),
      ];

      const result = groupStackedTrendRows(rows);

      expect(result).toEqual([
        {
          period: '2025-01',
          'Category 01': '100.00',
          'Category 02': '100.00',
          'Category 03': '100.00',
          'Category 04': '100.00',
          'Category 05': '100.00',
          'Category 06': '100.00',
          'Category 07': '100.00',
          'Category 08': '100.00',
          'Category 09': '100.00',
          'Category 10': '100.00',
          Other: '100.00',
        },
      ]);
    });
  });

  describe('getTransactionAnalysis', () => {
    it('returns empty analysis without querying when the date range is invalid', async () => {
      const { queryMany, queryOne } = await import('@/lib/db');

      const result = await getTransactionAnalysis({
        ...baseFilters,
        from: '2025-03-31',
        to: '2025-01-01',
        hasInvalidDateRange: true,
      });

      expect(result).toEqual(emptyTransactionAnalysis());
      expect(queryOne).not.toHaveBeenCalled();
      expect(queryMany).not.toHaveBeenCalled();
    });

    it('queries and shapes summary, trend, breakdown, stacked, and table rows', async () => {
      const { queryMany, queryOne } = await import('@/lib/db');
      const filters: AnalysisFilters = {
        ...baseFilters,
        accountId: 7,
        includedCategoryIds: [2, 5],
        hasCategoryFilter: true,
      };
      const expectedParams = ['2025-01-01', '2025-03-31', 7, [2, 5]];

      vi.mocked(queryOne).mockResolvedValue({
        income: '6000.00',
        expenses: '1500.00',
      });
      vi.mocked(queryMany)
        .mockResolvedValueOnce([
          { period: '2025-01', income: '4000.00', expenses: '900.00' },
          { period: '2025-02', income: '2000.00', expenses: '600.00' },
        ])
        .mockResolvedValueOnce([
          {
            category_id: 2,
            category_name: 'Rent',
            category_path: 'Housing > Rent',
            amount: '1000.00',
          },
          {
            category_id: null,
            category_name: 'Uncategorized',
            category_path: 'Uncategorized',
            amount: '500.00',
          },
        ])
        .mockResolvedValueOnce([
          {
            category_id: 1,
            category_name: 'Salary',
            category_path: 'Work > Salary',
            amount: '6000.00',
          },
        ])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'expense-2',
            category_path: 'Housing > Rent',
            amount: '900.00',
          },
          {
            period: '2025-02',
            category_key: 'expense-2',
            category_path: 'Housing > Rent',
            amount: '100.00',
          },
          {
            period: '2025-02',
            category_key: 'expense-uncategorized',
            category_path: 'Uncategorized',
            amount: '500.00',
          },
        ])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'income-1',
            category_path: 'Work > Salary',
            amount: '4000.00',
          },
          {
            period: '2025-02',
            category_key: 'income-1',
            category_path: 'Work > Salary',
            amount: '2000.00',
          },
        ])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'income-1',
            category_type: 'income',
            category_path: 'Work > Salary',
            amount: '4000.00',
          },
          {
            period: '2025-02',
            category_key: 'income-1',
            category_type: 'income',
            category_path: 'Work > Salary',
            amount: '2000.00',
          },
          {
            period: '2025-01',
            category_key: 'expense-2',
            category_type: 'expense',
            category_path: 'Housing > Rent',
            amount: '900.00',
          },
          {
            period: '2025-02',
            category_key: 'expense-2',
            category_type: 'expense',
            category_path: 'Housing > Rent',
            amount: '100.00',
          },
        ]);

      const result = await getTransactionAnalysis(filters);

      expect(queryOne).toHaveBeenCalledTimes(1);
      expect(queryMany).toHaveBeenCalledTimes(6);
      const allQueryCalls = [
        vi.mocked(queryOne).mock.calls[0],
        ...vi.mocked(queryMany).mock.calls,
      ];

      for (const [sql, params] of allQueryCalls) {
        expect(sql).toContain('WITH RECURSIVE category_hierarchy');
        expect(sql).toContain('t.date >= $1');
        expect(sql).toContain('t.date <= $2');
        expect(sql).toContain('t.account_id = $3');
        expect(sql).toContain('t.category_id = ANY($4::int[])');
        expect(sql).toContain('(t.category_id IS NULL AND t.amount > 0)');
        expect(sql).toContain('(t.category_id IS NULL AND t.amount < 0)');
        expect(params).toEqual(expectedParams);
      }

      const queryManyCalls = vi.mocked(queryMany).mock.calls;
      const summarySql = vi.mocked(queryOne).mock.calls[0][0];
      const incomeExpenseTrendSql = queryManyCalls[0][0];
      const incomeExpenseClassificationSql = [summarySql, incomeExpenseTrendSql];

      for (const sql of incomeExpenseClassificationSql) {
        expect(sql).toContain("WHEN ch.category_type = 'income' THEN t.amount");
        expect(sql).toContain("WHEN ch.category_type = 'expense' THEN ABS(t.amount)");
        expect(sql).toContain('WHEN t.category_id IS NULL AND t.amount > 0 THEN t.amount');
        expect(sql).toContain(
          'WHEN t.category_id IS NULL AND t.amount < 0 THEN ABS(t.amount)'
        );
      }

      expect(queryManyCalls[0][0]).toContain(
        "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')"
      );
      expect(queryManyCalls[3][0]).toContain(
        "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')"
      );
      expect(queryManyCalls[4][0]).toContain(
        "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')"
      );
      expect(queryManyCalls[5][0]).toContain(
        "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')"
      );

      expect(queryManyCalls[1][0]).toContain("ch.category_type = 'expense'");
      expect(queryManyCalls[1][0]).toContain('(t.category_id IS NULL AND t.amount < 0)');
      expect(queryManyCalls[2][0]).toContain("ch.category_type = 'income'");
      expect(queryManyCalls[2][0]).toContain('(t.category_id IS NULL AND t.amount > 0)');
      expect(queryManyCalls[3][0]).toContain("ch.category_type = 'expense'");
      expect(queryManyCalls[3][0]).toContain('(t.category_id IS NULL AND t.amount < 0)');
      expect(queryManyCalls[4][0]).toContain("ch.category_type = 'income'");
      expect(queryManyCalls[4][0]).toContain('(t.category_id IS NULL AND t.amount > 0)');
      expect(queryManyCalls[5][0]).toContain("WHEN ch.category_type = 'expense'");
      expect(queryManyCalls[5][0]).toContain("WHEN ch.category_type = 'income'");
      expect(queryManyCalls[5][0]).toContain(
        "WHEN t.category_id IS NULL AND t.amount < 0 THEN 'expense'"
      );
      expect(queryManyCalls[5][0]).toContain(
        "WHEN t.category_id IS NULL AND t.amount > 0 THEN 'income'"
      );

      expect(result).toEqual({
        summary: {
          income: '6000.00',
          expenses: '1500.00',
        },
        incomeExpenseTrend: [
          { period: '2025-01', income: '4000.00', expenses: '900.00' },
          { period: '2025-02', income: '2000.00', expenses: '600.00' },
          { period: '2025-03', income: '0.00', expenses: '0.00' },
        ],
        expenseBreakdown: [
          {
            category_id: 2,
            category_name: 'Rent',
            category_path: 'Housing > Rent',
            amount: '1000.00',
            percentage: 66.66666666666666,
          },
          {
            category_id: null,
            category_name: 'Uncategorized',
            category_path: 'Uncategorized',
            amount: '500.00',
            percentage: 33.33333333333333,
          },
        ],
        incomeBreakdown: [
          {
            category_id: 1,
            category_name: 'Salary',
            category_path: 'Work > Salary',
            amount: '6000.00',
            percentage: 100,
          },
        ],
        expenseStackedTrend: [
          { period: '2025-01', 'Housing > Rent': '900.00' },
          {
            period: '2025-02',
            'Housing > Rent': '100.00',
            Uncategorized: '500.00',
          },
          { period: '2025-03' },
        ],
        incomeStackedTrend: [
          { period: '2025-01', 'Work > Salary': '4000.00' },
          { period: '2025-02', 'Work > Salary': '2000.00' },
          { period: '2025-03' },
        ],
        categoryTrends: [
          {
            categoryKey: 'income-1',
            categoryType: 'income',
            categoryPath: 'Work > Salary',
            total: '6000.00',
            periods: {
              '2025-01': '4000.00',
              '2025-02': '2000.00',
            },
          },
          {
            categoryKey: 'expense-2',
            categoryType: 'expense',
            categoryPath: 'Housing > Rent',
            total: '1000.00',
            periods: {
              '2025-01': '900.00',
              '2025-02': '100.00',
            },
          },
        ],
      });
    });

    it('sorts category trend rows with equal totals by category path then key', async () => {
      const { queryMany, queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue({
        income: '0.00',
        expenses: '0.00',
      });
      vi.mocked(queryMany)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'expense-3',
            category_type: 'expense',
            category_path: 'Category B',
            amount: '100.00',
          },
          {
            period: '2025-01',
            category_key: 'expense-2',
            category_type: 'expense',
            category_path: 'Category A',
            amount: '100.00',
          },
          {
            period: '2025-01',
            category_key: 'expense-1',
            category_type: 'expense',
            category_path: 'Category A',
            amount: '100.00',
          },
        ]);

      const result = await getTransactionAnalysis(baseFilters);

      expect(result.categoryTrends).toEqual([
        {
          categoryKey: 'expense-1',
          categoryType: 'expense',
          categoryPath: 'Category A',
          total: '100.00',
          periods: {
            '2025-01': '100.00',
          },
        },
        {
          categoryKey: 'expense-2',
          categoryType: 'expense',
          categoryPath: 'Category A',
          total: '100.00',
          periods: {
            '2025-01': '100.00',
          },
        },
        {
          categoryKey: 'expense-3',
          categoryType: 'expense',
          categoryPath: 'Category B',
          total: '100.00',
          periods: {
            '2025-01': '100.00',
          },
        },
      ]);
    });

    it('fills missing selected-range monthly buckets with zero trend values', async () => {
      const { queryMany, queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue({
        income: '1000.00',
        expenses: '500.00',
      });
      vi.mocked(queryMany)
        .mockResolvedValueOnce([
          { period: '2025-01', income: '1000.00', expenses: '500.00' },
          { period: '2025-03', income: '0.00', expenses: '0.00' },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'expense-2',
            category_path: 'Housing > Rent',
            amount: '500.00',
          },
        ])
        .mockResolvedValueOnce([
          {
            period: '2025-01',
            category_key: 'income-1',
            category_path: 'Work > Salary',
            amount: '1000.00',
          },
        ])
        .mockResolvedValueOnce([]);

      const result = await getTransactionAnalysis(baseFilters);

      expect(result.incomeExpenseTrend).toEqual([
        { period: '2025-01', income: '1000.00', expenses: '500.00' },
        { period: '2025-02', income: '0.00', expenses: '0.00' },
        { period: '2025-03', income: '0.00', expenses: '0.00' },
      ]);
      expect(result.expenseStackedTrend).toEqual([
        { period: '2025-01', 'Housing > Rent': '500.00' },
        { period: '2025-02' },
        { period: '2025-03' },
      ]);
      expect(result.incomeStackedTrend).toEqual([
        { period: '2025-01', 'Work > Salary': '1000.00' },
        { period: '2025-02' },
        { period: '2025-03' },
      ]);
    });
  });
});
