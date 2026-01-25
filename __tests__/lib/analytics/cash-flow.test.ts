import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAccountSummary,
  getMonthlyCashFlow,
  getCategoryBreakdown,
} from '@/lib/analytics/cash-flow';
import {
  mockAccountSummary,
  mockMonthlyData,
  mockCategoryBreakdown,
} from '../utils/mocks';

// Mock the database module
vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
  queryMany: vi.fn(),
}));

describe('Cash Flow Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAccountSummary', () => {
    it('should return account summary with data', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccountSummary);

      const result = await getAccountSummary();

      expect(result).toEqual(mockAccountSummary);
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('total_balance')
      );
    });

    it('should return default values when no data', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(null);

      const result = await getAccountSummary();

      expect(result).toEqual({
        total_balance: '0.00',
        monthly_income: '0.00',
        monthly_expenses: '0.00',
        net_cash_flow: '0.00',
      });
    });

    it('should query for current month data', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccountSummary);

      await getAccountSummary();

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('month', CURRENT_DATE)")
      );
    });

    it('should calculate monthly income from income categories', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccountSummary);

      const result = await getAccountSummary();

      expect(result.monthly_income).toBe('5000.00');
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining("c.category_type = 'income'")
      );
    });

    it('should calculate monthly expenses from expense categories', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccountSummary);

      const result = await getAccountSummary();

      expect(result.monthly_expenses).toBe('3000.00');
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining("c.category_type = 'expense'")
      );
    });

    it('should use COALESCE for null safety', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccountSummary);

      await getAccountSummary();

      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE')
      );
    });
  });

  describe('getMonthlyCashFlow', () => {
    it('should return monthly cash flow data', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      const result = await getMonthlyCashFlow();

      expect(result).toEqual(mockMonthlyData);
      expect(result).toHaveLength(2);
    });

    it('should use default 6 months when no parameter provided', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      await getMonthlyCashFlow();

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        [6]
      );
    });

    it('should accept custom month range', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      await getMonthlyCashFlow(12);

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        [12]
      );
    });

    it('should return data in YYYY-MM format', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      const result = await getMonthlyCashFlow();

      expect(result[0].month).toMatch(/^\d{4}-\d{2}$/);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining("TO_CHAR(DATE_TRUNC('month'"),
        [6]
      );
    });

    it('should separate income and expenses', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      const result = await getMonthlyCashFlow();

      expect(result[0]).toHaveProperty('income');
      expect(result[0]).toHaveProperty('expenses');
      expect(result[0]).toHaveProperty('net');
    });

    it('should order by month DESC', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue(mockMonthlyData);

      await getMonthlyCashFlow();

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY month DESC'),
        [6]
      );
    });

    it('should return empty array when no data', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getMonthlyCashFlow();

      expect(result).toEqual([]);
    });

    it('should handle single month request', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([mockMonthlyData[0]]);

      const result = await getMonthlyCashFlow(1);

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        [1]
      );
    });
  });

  describe('getCategoryBreakdown', () => {
    it('should return category breakdown for expenses', async () => {
      const { queryMany } = await import('@/lib/db');

      const breakdownWithoutPercentage = mockCategoryBreakdown.map(({ percentage, ...rest }) => rest);
      vi.mocked(queryMany).mockResolvedValue(breakdownWithoutPercentage);

      const result = await getCategoryBreakdown('expense');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('category_name');
      expect(result[0]).toHaveProperty('amount');
      expect(result[0]).toHaveProperty('percentage');
      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        ['expense', 10]
      );
    });

    it('should return category breakdown for income', async () => {
      const { queryMany } = await import('@/lib/db');

      const breakdownWithoutPercentage = mockCategoryBreakdown.map(({ percentage, ...rest }) => rest);
      vi.mocked(queryMany).mockResolvedValue(breakdownWithoutPercentage);

      const result = await getCategoryBreakdown('income');

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        ['income', 10]
      );
    });

    it('should calculate percentages correctly', async () => {
      const { queryMany } = await import('@/lib/db');

      const data = [
        { category_id: 1, category_name: 'Cat1', category_path: 'Cat1', amount: '600.00' },
        { category_id: 2, category_name: 'Cat2', category_path: 'Cat2', amount: '400.00' },
      ];
      vi.mocked(queryMany).mockResolvedValue(data);

      const result = await getCategoryBreakdown('expense');

      expect(result[0].percentage).toBe(60); // 600 / 1000 * 100
      expect(result[1].percentage).toBe(40); // 400 / 1000 * 100
    });

    it('should handle zero total gracefully', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getCategoryBreakdown('expense');

      expect(result).toEqual([]);
    });

    it('should use default limit of 10', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getCategoryBreakdown('expense');

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        ['expense', 10]
      );
    });

    it('should accept custom limit', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getCategoryBreakdown('expense', 5);

      expect(queryMany).toHaveBeenCalledWith(
        expect.any(String),
        ['expense', 5]
      );
    });

    it('should include category paths', async () => {
      const { queryMany } = await import('@/lib/db');

      const breakdownWithoutPercentage = mockCategoryBreakdown.map(({ percentage, ...rest }) => rest);
      vi.mocked(queryMany).mockResolvedValue(breakdownWithoutPercentage);

      const result = await getCategoryBreakdown('expense');

      expect(result[0]).toHaveProperty('category_path');
      expect(result[0].category_path).toBe('Food > Groceries');
    });

    it('should handle uncategorized transactions', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getCategoryBreakdown('expense');

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('Uncategorized'),
        ['expense', 10]
      );
    });

    it('should filter by current month', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getCategoryBreakdown('expense');

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining("DATE_TRUNC('month', CURRENT_DATE)"),
        ['expense', 10]
      );
    });

    it('should order by amount DESC', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getCategoryBreakdown('expense');

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY amount DESC'),
        ['expense', 10]
      );
    });
  });
});
