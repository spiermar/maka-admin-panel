import { queryMany, queryOne, execute, executeReturning } from './index';
import { ExpenseReport, ExpenseReportWithDetails, Expense, ExpenseWithDetails } from './types';

export async function getExpenseReports(): Promise<ExpenseReportWithDetails[]> {
  return queryMany<ExpenseReportWithDetails>(
    `SELECT 
      er.*,
      u.username,
      ab.username as approved_by_username
    FROM expense_reports er
    INNER JOIN users u ON er.user_id = u.id
    LEFT JOIN users ab ON er.approved_by = ab.id
    ORDER BY er.created_at DESC`
  );
}

export async function getExpenseReportById(id: number): Promise<ExpenseReportWithDetails | null> {
  return queryOne<ExpenseReportWithDetails>(
    `SELECT 
      er.*,
      u.username,
      ab.username as approved_by_username
    FROM expense_reports er
    INNER JOIN users u ON er.user_id = u.id
    LEFT JOIN users ab ON er.approved_by = ab.id
    WHERE er.id = $1`,
    [id]
  );
}

export async function getExpenseReportsByUser(userId: number): Promise<ExpenseReportWithDetails[]> {
  return queryMany<ExpenseReportWithDetails>(
    `SELECT 
      er.*,
      u.username,
      ab.username as approved_by_username
    FROM expense_reports er
    INNER JOIN users u ON er.user_id = u.id
    LEFT JOIN users ab ON er.approved_by = ab.id
    WHERE er.user_id = $1
    ORDER BY er.created_at DESC`,
    [userId]
  );
}

export async function createExpenseReport(
  userId: number,
  title: string,
  description?: string
): Promise<ExpenseReport> {
  return executeReturning<ExpenseReport>(
    `INSERT INTO expense_reports (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, title, description || null]
  );
}

export async function updateExpenseReport(
  id: number,
  title: string,
  description?: string
): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET title = $1, description = $2, updated_at = NOW()
     WHERE id = $3`,
    [title, description || null, id]
  );
}

export async function submitExpenseReport(id: number): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'draft'`,
    [id]
  );
}

export async function approveExpenseReport(id: number, approvedBy: number): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET status = 'approved', approved_at = NOW(), approved_by = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'submitted'`,
    [id, approvedBy]
  );
}

export async function rejectExpenseReport(id: number): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET status = 'rejected', updated_at = NOW()
     WHERE id = $1 AND status = 'submitted'`,
    [id]
  );
}

export async function markExpenseReportReimbursed(id: number): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET reimbursed_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

export async function updateExpenseReportTotal(id: number): Promise<void> {
  await execute(
    `UPDATE expense_reports 
     SET total_amount = (
       SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE expense_report_id = $1
     ), updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

export async function getExpensesByReport(reportId: number): Promise<ExpenseWithDetails[]> {
  return queryMany<ExpenseWithDetails>(
    `SELECT 
      e.*,
      c.name as category_name,
      COALESCE(ch.full_path, 'Uncategorized') as category_path,
      t.date as transaction_date
    FROM expenses e
    LEFT JOIN categories c ON e.category_id = c.id
    LEFT JOIN (
      WITH RECURSIVE category_hierarchy AS (
        SELECT id, name, parent_id, name::varchar as full_path
        FROM categories WHERE parent_id IS NULL
        UNION ALL
        SELECT c.id, c.name, c.parent_id, ch.full_path || ' > ' || c.name
        FROM categories c
        INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
      )
      SELECT * FROM category_hierarchy
    ) ch ON e.category_id = ch.id
    LEFT JOIN transactions t ON e.transaction_id = t.id
    WHERE e.expense_report_id = $1
    ORDER BY e.date DESC`,
    [reportId]
  );
}

export async function addExpense(
  reportId: number,
  data: {
    transaction_id?: number;
    payee: string;
    amount: string;
    date: string;
    category_id?: number;
    memo?: string;
  }
): Promise<Expense> {
  return executeReturning<Expense>(
    `INSERT INTO expenses (expense_report_id, transaction_id, payee, amount, date, category_id, memo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [reportId, data.transaction_id || null, data.payee, data.amount, data.date, data.category_id || null, data.memo || null]
  );
}

export async function updateExpense(
  id: number,
  data: {
    payee: string;
    amount: string;
    date: string;
    category_id?: number;
    memo?: string;
  }
): Promise<void> {
  await execute(
    `UPDATE expenses 
     SET payee = $1, amount = $2, date = $3, category_id = $4, memo = $5
     WHERE id = $6`,
    [data.payee, data.amount, data.date, data.category_id || null, data.memo || null, id]
  );
}

export async function deleteExpense(id: number, reportId: number): Promise<void> {
  await execute('DELETE FROM expenses WHERE id = $1', [id]);
  await updateExpenseReportTotal(reportId);
}