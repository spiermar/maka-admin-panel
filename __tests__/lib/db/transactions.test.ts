import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTransactionById,
  getTransactionsByAccount,
  getRecentTransactions,
} from '@/lib/db/transactions';
import { mockTransaction, mockTransactionWithDetails } from '../utils/mocks';

// Mock the database module
vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
  queryMany: vi.fn(),
}));

describe('Transaction Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTransactionById', () => {
    it('should return transaction when found', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockTransaction);

      const result = await getTransactionById(1);

      expect(result).toEqual(mockTransaction);
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM transactions WHERE id = $1',
        [1]
      );
    });

    it('should return null when transaction not found', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(null);

      const result = await getTransactionById(999);

      expect(result).toBeNull();
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM transactions WHERE id = $1',
        [999]
      );
    });

    it('should handle different transaction IDs', async () => {
      const { queryOne } = await import('@/lib/db');

      const transaction2 = { ...mockTransaction, id: 2 };
      vi.mocked(queryOne).mockResolvedValue(transaction2);

      const result = await getTransactionById(2);

      expect(result?.id).toBe(2);
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM transactions WHERE id = $1',
        [2]
      );
    });
  });

  describe('getTransactionsByAccount', () => {
    it('should return transactions for account with default pagination', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactionsByAccount(1);

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [1, 100, 0]
      );
    });

    it('should return transactions with custom limit', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactionsByAccount(1, { limit: 50 });

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [1, 50, 0]
      );
    });

    it('should return transactions with custom offset', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactionsByAccount(1, { offset: 20 });

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [1, 100, 20]
      );
    });

    it('should return transactions with both limit and offset', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactionsByAccount(1, { limit: 25, offset: 50 });

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [1, 25, 50]
      );
    });

    it('should return empty array when no transactions found', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getTransactionsByAccount(999);

      expect(result).toEqual([]);
    });

    it('should include category path in results', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactionsByAccount(1);

      expect(result[0]).toHaveProperty('category_path');
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('category_path'),
        [1, 100, 0]
      );
    });

    it('should order by date DESC', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getTransactionsByAccount(1);

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY t.date DESC'),
        [1, 100, 0]
      );
    });
  });

  describe('getRecentTransactions', () => {
    it('should return recent transactions with default limit', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getRecentTransactions();

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [10]
      );
    });

    it('should return recent transactions with custom limit', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getRecentTransactions(5);

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [5]
      );
    });

    it('should return empty array when no transactions exist', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getRecentTransactions();

      expect(result).toEqual([]);
    });

    it('should include transaction details', async () => {
      const { queryMany } = await import('@/lib/db');

      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getRecentTransactions();

      expect(result[0]).toHaveProperty('account_name');
      expect(result[0]).toHaveProperty('category_name');
      expect(result[0]).toHaveProperty('category_path');
    });

    it('should order by date DESC and created_at DESC', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getRecentTransactions();

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY t.date DESC, t.created_at DESC'),
        [10]
      );
    });

    it('should handle large limit values', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getRecentTransactions(1000);

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [1000]
      );
    });
  });
});
