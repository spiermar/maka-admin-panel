import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllAccounts,
  getAccountById,
  getAccountBalance,
  getAllAccountsWithBalances,
} from '@/lib/db/accounts';
import { mockAccount } from '../utils/mocks';

vi.mock('@/lib/db', () => ({
  queryOne: vi.fn(),
  queryMany: vi.fn(),
}));

describe('Account Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllAccounts', () => {
    it('should return all accounts ordered by name', async () => {
      const { queryMany } = await import('@/lib/db');

      const accounts = [
        { ...mockAccount, id: 2, name: 'Checking Account' },
        { ...mockAccount, id: 1, name: 'Savings Account' },
      ];
      vi.mocked(queryMany).mockResolvedValue(accounts);

      const result = await getAllAccounts();

      expect(result).toEqual(accounts);
      expect(queryMany).toHaveBeenCalledWith(
        'SELECT * FROM accounts ORDER BY name ASC'
      );
    });

    it('should return empty array when no accounts exist', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getAllAccounts();

      expect(result).toEqual([]);
    });

    it('should include account id, name, and created_at', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([mockAccount]);

      const result = await getAllAccounts();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('created_at');
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(mockAccount);

      const result = await getAccountById(1);

      expect(result).toEqual(mockAccount);
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = $1',
        [1]
      );
    });

    it('should return null when account not found', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(null);

      const result = await getAccountById(999);

      expect(result).toBeNull();
      expect(queryOne).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = $1',
        [999]
      );
    });

    it('should handle different account IDs', async () => {
      const { queryOne } = await import('@/lib/db');

      const account2 = { ...mockAccount, id: 5, name: 'Credit Card' };
      vi.mocked(queryOne).mockResolvedValue(account2);

      const result = await getAccountById(5);

      expect(result?.id).toBe(5);
      expect(result?.name).toBe('Credit Card');
    });
  });

  describe('getAccountBalance', () => {
    it('should return balance for account with transactions', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue({ balance: '1500.50' });

      const result = await getAccountBalance(1);

      expect(result).toBe('1500.50');
      expect(queryOne).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE(SUM(amount), 0)'),
        [1]
      );
    });

    it('should return 0.00 for account with no transactions', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue({ balance: '0.00' });

      const result = await getAccountBalance(1);

      expect(result).toBe('0.00');
    });

    it('should return 0.00 when query returns null', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue(null);

      const result = await getAccountBalance(1);

      expect(result).toBe('0.00');
    });

    it('should handle negative balance (debts)', async () => {
      const { queryOne } = await import('@/lib/db');

      vi.mocked(queryOne).mockResolvedValue({ balance: '-250.75' });

      const result = await getAccountBalance(1);

      expect(result).toBe('-250.75');
    });
  });

  describe('getAllAccountsWithBalances', () => {
    it('should return accounts with their balances', async () => {
      const { queryMany } = await import('@/lib/db');

      const accountsWithBalances = [
        { id: 1, name: 'Checking Account', created_at: new Date(), balance: '1000.00' },
        { id: 2, name: 'Savings Account', created_at: new Date(), balance: '5000.00' },
      ];
      vi.mocked(queryMany).mockResolvedValue(accountsWithBalances);

      const result = await getAllAccountsWithBalances();

      expect(result).toEqual(accountsWithBalances);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN transactions t')
      );
    });

    it('should return empty array when no accounts exist', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      const result = await getAllAccountsWithBalances();

      expect(result).toEqual([]);
    });

    it('should return 0.00 balance for accounts without transactions', async () => {
      const { queryMany } = await import('@/lib/db');

      const accountsWithBalances = [
        { id: 1, name: 'Empty Account', created_at: new Date(), balance: '0.00' },
      ];
      vi.mocked(queryMany).mockResolvedValue(accountsWithBalances);

      const result = await getAllAccountsWithBalances();

      expect(result[0].balance).toBe('0.00');
    });

    it('should order accounts by name ASC', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getAllAccountsWithBalances();

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY a.name ASC')
      );
    });

    it('should group by account id', async () => {
      const { queryMany } = await import('@/lib/db');

      vi.mocked(queryMany).mockResolvedValue([]);

      await getAllAccountsWithBalances();

      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY a.id')
      );
    });

    it('should include all account fields plus balance', async () => {
      const { queryMany } = await import('@/lib/db');

      const accountsWithBalances = [
        { id: 1, name: 'Test Account', created_at: new Date(), balance: '100.00' },
      ];
      vi.mocked(queryMany).mockResolvedValue(accountsWithBalances);

      const result = await getAllAccountsWithBalances();

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('created_at');
      expect(result[0]).toHaveProperty('balance');
    });

    it('should handle negative balances', async () => {
      const { queryMany } = await import('@/lib/db');

      const accountsWithBalances = [
        { id: 1, name: 'Credit Card', created_at: new Date(), balance: '-500.00' },
      ];
      vi.mocked(queryMany).mockResolvedValue(accountsWithBalances);

      const result = await getAllAccountsWithBalances();

      expect(result[0].balance).toBe('-500.00');
    });
  });
});
