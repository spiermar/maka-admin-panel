'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth, getCurrentUser } from '@/lib/auth/session';
import * as db from '@/lib/db/expense-reports';
import { expenseReportSchema, expenseSchema } from '@/lib/validations/expense-reports';

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
    const report = await db.createExpenseReport(user.userId!, result.data.title, result.data.description);
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
    await db.approveExpenseReport(id, user.userId!);
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