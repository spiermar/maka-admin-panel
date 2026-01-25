import { queryMany, queryOne } from '@/lib/db';
import { MonthlyData, CategoryBreakdown, AccountSummary } from './types';

export async function getAccountSummary(): Promise<AccountSummary> {
  const result = await queryOne<AccountSummary>(
    `SELECT
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as total_balance,
       COALESCE(SUM(CASE
         WHEN c.category_type = 'income'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as monthly_income,
       COALESCE(ABS(SUM(CASE
         WHEN c.category_type = 'expense'
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END)), 0)::decimal(15,2) as monthly_expenses,
       COALESCE(SUM(CASE
         WHEN DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
         THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as net_cash_flow
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id`
  );

  return result || {
    total_balance: '0.00',
    monthly_income: '0.00',
    monthly_expenses: '0.00',
    net_cash_flow: '0.00',
  };
}

export async function getMonthlyCashFlow(
  months: number = 6
): Promise<MonthlyData[]> {
  return queryMany<MonthlyData>(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM') as month,
       COALESCE(SUM(CASE WHEN c.category_type = 'income' THEN t.amount ELSE 0 END), 0)::decimal(15,2) as income,
       COALESCE(ABS(SUM(CASE WHEN c.category_type = 'expense' THEN t.amount ELSE 0 END)), 0)::decimal(15,2) as expenses,
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as net
     FROM transactions t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.date >= CURRENT_DATE - INTERVAL '1 month' * $1
     GROUP BY DATE_TRUNC('month', t.date)
     ORDER BY month DESC`,
    [months]
  );
}

export async function getCategoryBreakdown(
  categoryType: 'income' | 'expense',
  limit: number = 10
): Promise<CategoryBreakdown[]> {
  const rows = await queryMany<Omit<CategoryBreakdown, 'percentage'>>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path, 1 as depth_level
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name,
              ch.depth_level + 1
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     ),
     category_totals AS (
       SELECT
         t.category_id,
         COALESCE(c.name, 'Uncategorized') as category_name,
         COALESCE(ch.full_path, 'Uncategorized') as category_path,
         ABS(SUM(t.amount))::decimal(15,2) as amount
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
       WHERE (c.category_type = $1 OR t.category_id IS NULL)
         AND DATE_TRUNC('month', t.date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY t.category_id, c.name, ch.full_path
     )
     SELECT category_id, category_name, category_path, amount FROM category_totals
     WHERE amount > 0
     ORDER BY amount DESC
     LIMIT $2`,
    [categoryType, limit]
  );

  const total = rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);

  return rows.map((row) => ({
    ...row,
    percentage: total > 0 ? (parseFloat(row.amount) / total) * 100 : 0,
  }));
}
