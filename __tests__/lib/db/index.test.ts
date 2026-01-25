import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryOne, queryMany, execute, executeReturning } from '@/lib/db';

// Mock @vercel/postgres
vi.mock('@vercel/postgres', () => ({
  sql: {
    query: vi.fn(),
  },
}));

describe('Database Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queryOne', () => {
    it('should return first row when data exists', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRow = { id: 1, name: 'Test' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow, { id: 2, name: 'Test 2' }],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryOne('SELECT * FROM test WHERE id = $1', [1]);

      expect(result).toEqual(mockRow);
      expect(sql.query).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [1]);
    });

    it('should return null when no rows found', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryOne('SELECT * FROM test WHERE id = $1', [999]);

      expect(result).toBeNull();
    });

    it('should work without parameters', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRow = { count: 10 };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryOne('SELECT COUNT(*) as count FROM test');

      expect(result).toEqual(mockRow);
      expect(sql.query).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM test', []);
    });

    it('should handle typed results', async () => {
      const { sql } = await import('@vercel/postgres');

      interface User {
        id: number;
        username: string;
      }

      const mockUser: User = { id: 1, username: 'testuser' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryOne<User>('SELECT * FROM users WHERE id = $1', [1]);

      expect(result).toEqual(mockUser);
      if (result) {
        expect(result.id).toBe(1);
        expect(result.username).toBe('testuser');
      }
    });
  });

  describe('queryMany', () => {
    it('should return all rows', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRows = [
        { id: 1, name: 'Test 1' },
        { id: 2, name: 'Test 2' },
        { id: 3, name: 'Test 3' },
      ];
      vi.mocked(sql.query).mockResolvedValue({
        rows: mockRows,
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryMany('SELECT * FROM test');

      expect(result).toEqual(mockRows);
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no rows found', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryMany('SELECT * FROM test WHERE id > $1', [1000]);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should work with parameters', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRows = [{ id: 1, name: 'Test' }];
      vi.mocked(sql.query).mockResolvedValue({
        rows: mockRows,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryMany('SELECT * FROM test WHERE name = $1', ['Test']);

      expect(result).toEqual(mockRows);
      expect(sql.query).toHaveBeenCalledWith('SELECT * FROM test WHERE name = $1', ['Test']);
    });

    it('should handle typed results', async () => {
      const { sql } = await import('@vercel/postgres');

      interface Transaction {
        id: number;
        amount: string;
      }

      const mockTransactions: Transaction[] = [
        { id: 1, amount: '100.00' },
        { id: 2, amount: '200.00' },
      ];
      vi.mocked(sql.query).mockResolvedValue({
        rows: mockTransactions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await queryMany<Transaction>('SELECT * FROM transactions');

      expect(result).toEqual(mockTransactions);
      expect(result[0].amount).toBe('100.00');
    });
  });

  describe('execute', () => {
    it('should execute mutation query', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      await execute('DELETE FROM test WHERE id = $1', [1]);

      expect(sql.query).toHaveBeenCalledWith('DELETE FROM test WHERE id = $1', [1]);
    });

    it('should handle INSERT queries', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      await execute('INSERT INTO test (name) VALUES ($1)', ['Test']);

      expect(sql.query).toHaveBeenCalledWith('INSERT INTO test (name) VALUES ($1)', ['Test']);
    });

    it('should handle UPDATE queries', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await execute('UPDATE test SET name = $1 WHERE id = $2', ['Updated', 1]);

      expect(sql.query).toHaveBeenCalledWith('UPDATE test SET name = $1 WHERE id = $2', ['Updated', 1]);
    });

    it('should not return value', async () => {
      const { sql } = await import('@vercel/postgres');

      vi.mocked(sql.query).mockResolvedValue({
        rows: [],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await execute('DELETE FROM test WHERE id = $1', [1]);

      expect(result).toBeUndefined();
    });
  });

  describe('executeReturning', () => {
    it('should return first row from RETURNING clause', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRow = { id: 1, name: 'Test' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await executeReturning('INSERT INTO test (name) VALUES ($1) RETURNING *', ['Test']);

      expect(result).toEqual(mockRow);
    });

    it('should work with UPDATE RETURNING', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRow = { id: 1, name: 'Updated' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await executeReturning(
        'UPDATE test SET name = $1 WHERE id = $2 RETURNING *',
        ['Updated', 1]
      );

      expect(result).toEqual(mockRow);
    });

    it('should handle typed results', async () => {
      const { sql } = await import('@vercel/postgres');

      interface NewTransaction {
        id: number;
        amount: string;
      }

      const mockRow: NewTransaction = { id: 1, amount: '100.00' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await executeReturning<NewTransaction>(
        'INSERT INTO transactions (amount) VALUES ($1) RETURNING *',
        ['100.00']
      );

      expect(result).toEqual(mockRow);
      expect(result.id).toBe(1);
    });

    it('should work with DELETE RETURNING', async () => {
      const { sql } = await import('@vercel/postgres');

      const mockRow = { id: 1, name: 'Deleted' };
      vi.mocked(sql.query).mockResolvedValue({
        rows: [mockRow],
        rowCount: 1,
        command: 'DELETE',
        oid: 0,
        fields: [],
      });

      const result = await executeReturning('DELETE FROM test WHERE id = $1 RETURNING *', [1]);

      expect(result).toEqual(mockRow);
    });
  });
});
