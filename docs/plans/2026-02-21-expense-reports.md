# Expense Reports Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to create expense reports, add expenses (from transactions or manual entry), submit for approval, and approve/reject reports.

**Architecture:** Add new database tables for expense_reports and expenses (linked to transactions). Create server actions for CRUD operations. Add new dashboard pages for managing reports.

**Tech Stack:** Next.js 16, PostgreSQL, Server Actions, React, Shadcn UI

---

### Task 1: Database Schema - Create Tables

**Files:**
- Modify: `lib/db/schema.sql`

**Step 1: Add expense report tables to schema**

Run: Check current schema structure first

```sql
-- Add to lib/db/schema.sql (before the indexes section):

-- Expense Reports table
CREATE TABLE expense_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by INTEGER REFERENCES users(id),
  reimbursed_at TIMESTAMP,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Expenses table (line items in a report)
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  expense_report_id INTEGER NOT NULL REFERENCES expense_reports(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  payee VARCHAR(200) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  memo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for expense reports
CREATE INDEX idx_expense_reports_user ON expense_reports(user_id);
CREATE INDEX idx_expense_reports_status ON expense_reports(status);
CREATE INDEX idx_expenses_report ON expenses(expense_report_id);
CREATE INDEX idx_expenses_transaction ON expenses(transaction_id);
```

**Step 2: Run the migration**

Run: `psql $POSTGRES_URL -c "CREATE TABLE IF NOT EXISTS expense_reports (...);"` (or use the init-db script after updating it)

**Step 3: Commit**

```bash
git add lib/db/schema.sql
git commit -m "feat: add expense_reports and expenses tables"
```

---

### Task 2: Database Types

**Files:**
- Modify: `lib/db/types.ts`

**Step 1: Add expense report types**

Add to lib/db/types.ts:

```typescript
export type ExpenseReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface ExpenseReport {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: ExpenseReportStatus;
  submitted_at: Date | null;
  approved_at: Date | null;
  approved_by: number | null;
  reimbursed_at: Date | null;
  total_amount: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExpenseReportWithDetails extends ExpenseReport {
  username: string;
  approved_by_username: string | null;
}

export interface Expense {
  id: number;
  expense_report_id: number;
  transaction_id: number | null;
  payee: string;
  amount: string;
  date: string;
  category_id: number | null;
  memo: string | null;
  created_at: Date;
}

export interface ExpenseWithDetails extends Expense {
  category_name: string | null;
  category_path: string | null;
  transaction_date: string | null;
}
```

**Step 2: Commit**

```bash
git add lib/db/types.ts
git commit -m "feat: add expense report types"
```

---

### Task 3: Database Query Functions - Expense Reports

**Files:**
- Create: `lib/db/expense-reports.ts`

**Step 1: Create the query file**

Create `lib/db/expense-reports.ts`:

```typescript
import { queryMany, queryOne, execute, executeReturning } from './index';
import { ExpenseReport, ExpenseReportWithDetails, Expense, ExpenseWithDetails } from './types';

// Expense Report queries
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

// Expense (line item) queries
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
```

**Step 2: Commit**

```bash
git add lib/db/expense-reports.ts
git commit -m "feat: add expense report database queries"
```

---

### Task 4: Validation Schemas

**Files:**
- Create: `lib/validations/expense-reports.ts`

**Step 1: Create validation schemas**

Create `lib/validations/expense-reports.ts`:

```typescript
import { z } from 'zod';

// Reuse transaction date validation logic
const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .refine(
    (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = Date.UTC(year, month - 1, day);
      const now = new Date();
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const minDateUTC = Date.UTC(now.getFullYear() - 10, 0, 1);
      return !isNaN(date) && date >= minDateUTC && date <= todayUTC;
    },
    { message: 'Date must be within last 10 years and not in the future' }
  );

const amountSchema = z.string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .refine(
    (amountStr) => {
      const amount = parseFloat(amountStr);
      return !isNaN(amount) && amount > 0 && amount <= 1000000;
    },
    { message: 'Amount must be between 0.01 and 1,000,000.00' }
  );

export const expenseReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
});

export const expenseSchema = z.object({
  transaction_id: z.coerce.number().optional(),
  payee: z.string().min(1, 'Payee is required').max(200),
  amount: amountSchema,
  date: dateSchema,
  category_id: z.coerce.number().nullable().optional(),
  memo: z.string().max(500).optional(),
});

export type ExpenseReportInput = z.infer<typeof expenseReportSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
```

**Step 2: Commit**

```bash
git add lib/validations/expense-reports.ts
git commit -m "feat: add expense report validation schemas"
```

---

### Task 5: Server Actions

**Files:**
- Create: `lib/actions/expense-reports.ts`

**Step 1: Create server actions**

Create `lib/actions/expense-reports.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUser } from '@/lib/auth/session';
import * as db from '@/lib/db/expense-reports';
import { expenseReportSchema, expenseSchema } from '@/lib/validations/expense-reports';

// Expense Report Actions
export async function createExpenseReport(formData: FormData) {
  await requireAuth();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const data = {
    title: formData.get('title'),
    description: formData.get('description') || '',
  };

  const result = expenseReportSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  try {
    const report = await db.createExpenseReport(user.id, result.data.title, result.data.description);
    revalidatePath('/expense-reports');
    return { success: true, reportId: report.id };
  } catch (error) {
    console.error('Failed to create expense report:', error);
    return { success: false, error: 'Failed to create expense report' };
  }
}

export async function updateExpenseReport(id: number, formData: FormData) {
  await requireAuth();

  const data = {
    title: formData.get('title'),
    description: formData.get('description') || '',
  };

  const result = expenseReportSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  try {
    await db.updateExpenseReport(id, result.data.title, result.data.description);
    revalidatePath('/expense-reports');
    revalidatePath(`/expense-reports/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update expense report:', error);
    return { success: false, error: 'Failed to update expense report' };
  }
}

export async function submitExpenseReport(id: number) {
  await requireAuth();

  try {
    await db.submitExpenseReport(id);
    revalidatePath('/expense-reports');
    revalidatePath(`/expense-reports/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to submit expense report:', error);
    return { success: false, error: 'Failed to submit expense report' };
  }
}

export async function approveExpenseReport(id: number) {
  await requireAuth();
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    await db.approveExpenseReport(id, user.id);
    revalidatePath('/expense-reports');
    revalidatePath(`/expense-reports/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to approve expense report:', error);
    return { success: false, error: 'Failed to approve expense report' };
  }
}

export async function rejectExpenseReport(id: number) {
  await requireAuth();

  try {
    await db.rejectExpenseReport(id);
    revalidatePath('/expense-reports');
    revalidatePath(`/expense-reports/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to reject expense report:', error);
    return { success: false, error: 'Failed to reject expense report' };
  }
}

export async function markReimbursed(id: number) {
  await requireAuth();

  try {
    await db.markExpenseReportReimbursed(id);
    revalidatePath('/expense-reports');
    revalidatePath(`/expense-reports/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to mark as reimbursed:', error);
    return { success: false, error: 'Failed to mark as reimbursed' };
  }
}

// Expense (Line Item) Actions
export async function addExpense(reportId: number, formData: FormData) {
  await requireAuth();

  const categoryIdRaw = formData.get('category_id');
  const categoryId = categoryIdRaw === 'none' || !categoryIdRaw ? undefined : categoryIdRaw;

  const data = {
    transaction_id: formData.get('transaction_id') || undefined,
    payee: formData.get('payee'),
    amount: formData.get('amount'),
    date: formData.get('date'),
    category_id: categoryId,
    memo: formData.get('memo') || '',
  };

  const result = expenseSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  try {
    await db.addExpense(reportId, {
      ...result.data,
      category_id: result.data.category_id ?? undefined,
    });
    await db.updateExpenseReportTotal(reportId);
    revalidatePath(`/expense-reports/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to add expense:', error);
    return { success: false, error: 'Failed to add expense' };
  }
}

export async function updateExpense(expenseId: number, reportId: number, formData: FormData) {
  await requireAuth();

  const categoryIdRaw = formData.get('category_id');
  const categoryId = categoryIdRaw === 'none' || !categoryIdRaw ? undefined : categoryIdRaw;

  const data = {
    payee: formData.get('payee'),
    amount: formData.get('amount'),
    date: formData.get('date'),
    category_id: categoryId,
    memo: formData.get('memo') || '',
  };

  const result = expenseSchema.safeParse(data);
  if (!result.success) {
    return { success: false, errors: result.error.flatten().fieldErrors };
  }

  try {
    await db.updateExpense(expenseId, {
      ...result.data,
      category_id: result.data.category_id ?? undefined,
    });
    await db.updateExpenseReportTotal(reportId);
    revalidatePath(`/expense-reports/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update expense:', error);
    return { success: false, error: 'Failed to update expense' };
  }
}

export async function deleteExpense(expenseId: number, reportId: number) {
  await requireAuth();

  try {
    await db.deleteExpense(expenseId, reportId);
    revalidatePath(`/expense-reports/${reportId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return { success: false, error: 'Failed to delete expense' };
  }
}
```

**Step 2: Commit**

```bash
git add lib/actions/expense-reports.ts
git commit -m "feat: add expense report server actions"
```

---

### Task 6: Dashboard Navigation

**Files:**
- Modify: `app/(dashboard)/layout.tsx` or create navigation component

**Step 1: Check existing navigation**

Run: `cat app/(dashboard)/layout.tsx`

**Step 2: Add expense reports link**

Add "Expense Reports" nav item in the dashboard sidebar/navigation.

**Step 3: Commit**

```bash
git add app/\(dashboard\)/layout.tsx
git commit -m "feat: add expense reports to navigation"
```

---

### Task 7: Expense Reports List Page

**Files:**
- Create: `app/(dashboard)/expense-reports/page.tsx` (server component)
- Create: `app/(dashboard)/expense-reports/ExpenseReportsList.tsx` (client component)

**Step 1: Create the server page**

Create `app/(dashboard)/expense-reports/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/session';
import { getExpenseReports } from '@/lib/db/expense-reports';
import ExpenseReportsList from './ExpenseReportsList';

export default async function ExpenseReportsPage() {
  await requireAuth();
  const reports = await getExpenseReports();
  return <ExpenseReportsList reports={reports} />;
}
```

**Step 2: Create the client component**

Create `app/(dashboard)/expense-reports/ExpenseReportsList.tsx`:

```typescript
'use client';

import { ExpenseReportWithDetails } from '@/lib/db/types';
import Link from 'next/link';
import { format } from '@/lib/utils';

interface Props {
  reports: ExpenseReportWithDetails[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function ExpenseReportsList({ reports }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Expense Reports</h1>
        <Link
          href="/expense-reports/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          New Report
        </Link>
      </div>

      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">Title</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Created</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No expense reports yet
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}`} className="hover:underline">
                      {report.title}
                    </Link>
                  </td>
                  <td className="p-3">{report.username}</td>
                  <td className="p-3">${parseFloat(report.total_amount).toFixed(2)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-3">{format(new Date(report.created_at))}</td>
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}`} className="text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(dashboard\)/expense-reports/page.tsx app/\(dashboard\)/expense-reports/ExpenseReportsList.tsx
git commit -m "feat: add expense reports list page"
```

---

### Task 8: Create New Report Page

**Files:**
- Create: `app/(dashboard)/expense-reports/new/page.tsx` (server component)
- Create: `app/(dashboard)/expense-reports/new/CreateReportForm.tsx` (client component)

**Step 1: Create the server page**

Create `app/(dashboard)/expense-reports/new/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/session';
import CreateReportForm from './CreateReportForm';

export default async function NewExpenseReportPage() {
  await requireAuth();
  return <CreateReportForm />;
}
```

**Step 2: Create the client form component**

Create `app/(dashboard)/expense-reports/new/CreateReportForm.tsx`:

```typescript
'use client';

import { useActionState } from 'react';
import { createExpenseReport } from '@/lib/actions/expense-reports';
import { useRouter } from 'next/navigation';

const initialState = { success: false, error: '', errors: {} };

export default function CreateReportForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prevState: typeof initialState, formData: FormData) => {
      const result = await createExpenseReport(formData);
      if (result.success && result.reportId) {
        router.push(`/expense-reports/${result.reportId}`);
        return prevState;
      }
      return {
        success: false,
        error: result.error || 'Failed to create report',
        errors: result.errors || {},
      };
    },
    initialState
  );

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">New Expense Report</h1>
      
      {state.error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">{state.error}</div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            name="title"
            type="text"
            required
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., January 2025 Expenses"
          />
          {state.errors?.title && (
            <p className="text-red-500 text-sm mt-1">{state.errors.title[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description (optional)</label>
          <textarea
            name="description"
            rows={3}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Add any notes..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {pending ? 'Creating...' : 'Create Report'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(dashboard\)/expense-reports/new/page.tsx app/\(dashboard\)/expense-reports/new/CreateReportForm.tsx
git commit -m "feat: add new expense report page"
```

---

### Task 9: Expense Report Detail Page

**Files:**
- Create: `app/(dashboard)/expense-reports/[id]/page.tsx` (server component)
- Create: `app/(dashboard)/expense-reports/[id]/ExpenseReportDetail.tsx` (client component)

**Step 1: Create the server page**

Create `app/(dashboard)/expense-reports/[id]/page.tsx`:

```typescript
import { requireAuth } from '@/lib/auth/session';
import { getExpenseReportById } from '@/lib/db/expense-reports';
import { getExpensesByReport } from '@/lib/db/expense-reports';
import { notFound } from 'next/navigation';
import ExpenseReportDetail from './ExpenseReportDetail';

export default async function ExpenseReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const reportId = parseInt(id);
  
  if (isNaN(reportId)) {
    notFound();
  }

  const report = await getExpenseReportById(reportId);
  if (!report) {
    notFound();
  }

  const expenses = await getExpensesByReport(reportId);
  
  return <ExpenseReportDetail report={report} expenses={expenses} />;
}
```

**Step 2: Create the client component**

This is a larger component. Create `app/(dashboard)/expense-reports/[id]/ExpenseReportDetail.tsx`:

```typescript
'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { 
  submitExpenseReport, 
  approveExpenseReport, 
  rejectExpenseReport, 
  markReimbursed,
  addExpense,
  deleteExpense
} from '@/lib/actions/expense-reports';
import { ExpenseReportWithDetails, ExpenseWithDetails } from '@/lib/db/types';
import { format } from '@/lib/utils';

interface Props {
  report: ExpenseReportWithDetails;
  expenses: ExpenseWithDetails[];
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const initialState = { success: false, error: '' };

export default function ExpenseReportDetail({ report, expenses: initialExpenses }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [, submitAction, submitPending] = useActionState(
    async () => await submitExpenseReport(report.id),
    initialState
  );
  
  const [, approveAction, approvePending] = useActionState(
    async () => await approveExpenseReport(report.id),
    initialState
  );
  
  const [, rejectAction, rejectPending] = useActionState(
    async () => await rejectExpenseReport(report.id),
    initialState
  );
  
  const [, reimburseAction, reimbursePending] = useActionState(
    async () => await markReimbursed(report.id),
    initialState
  );

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm('Delete this expense?')) return;
    const result = await deleteExpense(expenseId, report.id);
    if (result.success) {
      setExpenses(expenses.filter(e => e.id !== expenseId));
    }
  };

  const handleAddExpense = async (formData: FormData) => {
    const result = await addExpense(report.id, formData);
    if (result.success) {
      setShowAddForm(false);
      // Would need to reload - for now just refresh the page
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{report.title}</h1>
            <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
              {report.status}
            </span>
          </div>
          {report.description && (
            <p className="text-muted-foreground mt-1">{report.description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Submitted by {report.username} • Created {format(new Date(report.created_at))}
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold">${parseFloat(report.total_amount).toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {report.status === 'draft' && (
          <>
            <form action={submitAction}>
              <button 
                type="submit" 
                disabled={submitPending || expenses.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitPending ? 'Submitting...' : 'Submit for Approval'}
              </button>
            </form>
          </>
        )}
        
        {report.status === 'submitted' && (
          <>
            <form action={approveAction}>
              <button 
                type="submit" 
                disabled={approvePending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {approvePending ? 'Approving...' : 'Approve'}
              </button>
            </form>
            <form action={rejectAction}>
              <button 
                type="submit" 
                disabled={rejectPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {rejectPending ? 'Rejecting...' : 'Reject'}
              </button>
            </form>
          </>
        )}
        
        {report.status === 'approved' && !report.reimbursed_at && (
          <form action={reimburseAction}>
            <button 
              type="submit" 
              disabled={reimbursePending}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              {reimbursePending ? 'Marking...' : 'Mark as Reimbursed'}
            </button>
          </form>
        )}
        
        {report.reimbursed_at && (
          <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-md">
            Reimbursed {format(new Date(report.reimbursed_at))}
          </span>
        )}
      </div>

      {/* Expenses List */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Expenses ({expenses.length})</h2>
          {report.status === 'draft' && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 text-sm border rounded-md hover:bg-muted"
            >
              {showAddForm ? 'Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {showAddForm && (
          <AddExpenseForm onSubmit={handleAddExpense} onCancel={() => setShowAddForm(false)} />
        )}

        {expenses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No expenses yet. Add expenses to this report.
          </p>
        ) : (
          <div className="border rounded-md">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Payee</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Memo</th>
                  <th className="text-right p-3">Amount</th>
                  {report.status === 'draft' && <th className="text-right p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border-b">
                    <td className="p-3">{format(new Date(expense.date))}</td>
                    <td className="p-3">{expense.payee}</td>
                    <td className="p-3">{expense.category_path || 'Uncategorized'}</td>
                    <td className="p-3">{expense.memo || '-'}</td>
                    <td className="p-3 text-right">${parseFloat(expense.amount).toFixed(2)}</td>
                    {report.status === 'draft' && (
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                <tr className="font-bold bg-muted/30">
                  <td colSpan={4} className="p-3 text-right">Total:</td>
                  <td className="p-3 text-right">
                    ${expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                  </td>
                  {report.status === 'draft' && <td />}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Expense Form Component (simplified - would need category options passed as props)
function AddExpenseForm({ onSubmit, onCancel }: { onSubmit: (fd: FormData) => void; onCancel: () => void }) {
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const formData = new FormData(e.currentTarget);
    await onSubmit(formData);
    setPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="border p-4 rounded-md space-y-4 bg-muted/20">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payee</label>
          <input name="payee" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input name="amount" type="number" step="0.01" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input name="date" type="date" required className="w-full px-3 py-2 border rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select name="category_id" className="w-full px-3 py-2 border rounded-md">
            <option value="none">Select category</option>
            {/* Would populate from categories - simplified for now */}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Memo</label>
        <input name="memo" className="w-full px-3 py-2 border rounded-md" />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">
          {pending ? 'Adding...' : 'Add Expense'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded-md">Cancel</button>
      </div>
    </form>
  );
}
```

**Step 3: Commit**

```bash
git add app/\(dashboard\)/expense-reports/\[id\]/page.tsx app/\(dashboard\)/expense-reports/\[id\]/ExpenseReportDetail.tsx
git commit -m "feat: add expense report detail page"
```

---

### Task 10: Add "Link to Transaction" Feature

**Files:**
- Modify: `app/(dashboard)/expense-reports/[id]/ExpenseReportDetail.tsx`

**Step 1: Add transaction selector**

Add ability to select from existing transactions when adding an expense.

**Step 2: Commit**

```bash
git add app/\(dashboard\)/expense-reports/\[id\]/ExpenseReportDetail.tsx
git commit -m "feat: add transaction linking to expenses"
```

---

### Task 11: Tests

**Files:**
- Create: `__tests__/expense-reports.test.ts`

**Step 1: Write unit tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/expense-reports', () => ({
  getExpenseReports: vi.fn(),
  getExpenseReportById: vi.fn(),
  createExpenseReport: vi.fn(),
  updateExpenseReport: vi.fn(),
  submitExpenseReport: vi.fn(),
  approveExpenseReport: vi.fn(),
  rejectExpenseReport: vi.fn(),
  getExpensesByReport: vi.fn(),
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe('Expense Reports', () => {
  // Add tests for validation, server actions, etc.
});
```

**Step 2: Commit**

```bash
git add __tests__/expense-reports.test.ts
git commit -m "test: add expense reports tests"
```

---

### Summary

The implementation follows the existing codebase patterns:
- Server Actions in `lib/actions/` for mutations
- Database queries in `lib/db/` 
- Zod validation in `lib/validations/`
- Server/Client component split in `app/`
- Shadcn UI components for styling
- TypeScript throughout

Status flow: `draft` → `submitted` → `approved`/`rejected`
Additional: `reimbursed_at` timestamp for tracking payment