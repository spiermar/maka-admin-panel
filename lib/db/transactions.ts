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
    `SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       (
         WITH RECURSIVE category_path AS (
           SELECT id, name, parent_id, name as path
           FROM categories
           WHERE id = t.category_id

           UNION ALL

           SELECT c2.id, c2.name, c2.parent_id, c2.name || ' > ' || cp.path
           FROM categories c2
           INNER JOIN category_path cp ON c2.id = cp.parent_id
         )
         SELECT path FROM category_path WHERE parent_id IS NULL
       ) as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
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
    `SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       (
         WITH RECURSIVE category_path AS (
           SELECT id, name, parent_id, name as path
           FROM categories
           WHERE id = t.category_id

           UNION ALL

           SELECT c2.id, c2.name, c2.parent_id, c2.name || ' > ' || cp.path
           FROM categories c2
           INNER JOIN category_path cp ON c2.id = cp.parent_id
         )
         SELECT path FROM category_path WHERE parent_id IS NULL
       ) as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $1`,
    [limit]
  );
}
