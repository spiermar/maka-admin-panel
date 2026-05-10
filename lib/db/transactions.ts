import { queryMany, queryOne } from './index';
import { type TransactionFilters } from '@/lib/transactions/filters';
import { Transaction, TransactionWithDetails } from './types';

export async function getTransactionById(
  id: number
): Promise<Transaction | null> {
  return queryOne<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
    [id]
  );
}

function escapeLikeSearch(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildTransactionWhereClause(filters: TransactionFilters): {
  whereSql: string;
  params: Array<number | string>;
} {
  const clauses: string[] = [];
  const params: Array<number | string> = [];

  if (filters.accountId) {
    params.push(filters.accountId);
    clauses.push(`t.account_id = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    clauses.push(`t.date >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    clauses.push(`t.date <= $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    clauses.push(`t.category_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(`%${escapeLikeSearch(filters.q)}%`);
    clauses.push(
      `(t.payee ILIKE $${params.length} ESCAPE '\\\\' OR t.comment ILIKE $${params.length} ESCAPE '\\\\')`
    );
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

export async function getTransactions(
  filters: TransactionFilters,
  options?: { limit?: number; offset?: number }
): Promise<TransactionWithDetails[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  const { whereSql, params } = buildTransactionWhereClause(filters);
  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;

  return queryMany<TransactionWithDetails>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )
     SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereSql}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, limit, offset]
  );
}

export async function getTransactionsByAccount(
  accountId: number,
  options?: { limit?: number; offset?: number }
): Promise<TransactionWithDetails[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  return queryMany<TransactionWithDetails>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )
     SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     WHERE t.account_id = $1
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );
}

export async function getRecentTransactions(
  limit: number = 10
): Promise<TransactionWithDetails[]> {
  return queryMany<TransactionWithDetails>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )
     SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ORDER BY t.date DESC, t.created_at DESC
      LIMIT $1`,
    [limit]
  );
}

export async function getTransactionsForExpenseReport(
  limit: number = 50
): Promise<TransactionWithDetails[]> {
  return queryMany<TransactionWithDetails>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )
     SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     WHERE t.id NOT IN (
       SELECT transaction_id FROM expenses WHERE transaction_id IS NOT NULL
     )
     ORDER BY t.date DESC
     LIMIT $1`,
    [limit]
  );
}
