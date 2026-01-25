'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning } from '@/lib/db';
import { Transaction } from '@/lib/db/types';
import { transactionSchema } from '@/lib/validations/transactions';

export async function createTransaction(formData: FormData) {
  await requireAuth();

  const data = {
    account_id: formData.get('account_id'),
    date: formData.get('date'),
    payee: formData.get('payee'),
    category_id: formData.get('category_id') || null,
    amount: formData.get('amount'),
    comment: formData.get('comment') || '',
  };

  const result = transactionSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { account_id, date, payee, category_id, amount, comment } = result.data;

  try {
    await executeReturning<Transaction>(
      `INSERT INTO transactions (account_id, date, payee, category_id, amount, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [account_id, date, payee, category_id, amount, comment || null]
    );

    revalidatePath('/');
    revalidatePath(`/accounts/${account_id}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to create transaction:', error);
    return {
      success: false,
      error: 'Failed to create transaction',
    };
  }
}

export async function updateTransaction(id: number, formData: FormData) {
  await requireAuth();

  const data = {
    account_id: formData.get('account_id'),
    date: formData.get('date'),
    payee: formData.get('payee'),
    category_id: formData.get('category_id') || null,
    amount: formData.get('amount'),
    comment: formData.get('comment') || '',
  };

  const result = transactionSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { account_id, date, payee, category_id, amount, comment } = result.data;

  try {
    await execute(
      `UPDATE transactions
       SET account_id = $1, date = $2, payee = $3, category_id = $4, amount = $5, comment = $6, updated_at = NOW()
       WHERE id = $7`,
      [account_id, date, payee, category_id, amount, comment || null, id]
    );

    revalidatePath('/');
    revalidatePath(`/accounts/${account_id}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to update transaction:', error);
    return {
      success: false,
      error: 'Failed to update transaction',
    };
  }
}

export async function deleteTransaction(id: number, accountId: number) {
  await requireAuth();

  try {
    await execute('DELETE FROM transactions WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath(`/accounts/${accountId}`);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    return {
      success: false,
      error: 'Failed to delete transaction',
    };
  }
}
