import { queryMany, queryOne } from './index';
import { Transaction, TransactionWithDetails } from './types';

export async function getTransactionById(
  id: number
): Promise<Transaction | null> {
  return queryOne<Transaction>(
    'SELECT * FROM transactions WHERE id = $1',
    [id]
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
