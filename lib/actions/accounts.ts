'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning, queryOne } from '@/lib/db';
import { Account } from '@/lib/db/types';
import { accountSchema } from '@/lib/validations/accounts';

export async function createAccount(formData: FormData) {
  await requireAuth();

  const result = accountSchema.safeParse({
    name: formData.get('name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name } = result.data;

  try {
    await executeReturning<Account>(
      'INSERT INTO accounts (name) VALUES ($1) RETURNING *',
      [name]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to create account:', error);
    return {
      success: false,
      error: 'Failed to create account',
    };
  }
}

export async function updateAccount(id: number, formData: FormData) {
  await requireAuth();

  const result = accountSchema.safeParse({
    name: formData.get('name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name } = result.data;

  try {
    await execute(
      'UPDATE accounts SET name = $1 WHERE id = $2',
      [name, id]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to update account:', error);
    return {
      success: false,
      error: 'Failed to update account',
    };
  }
}

export async function deleteAccount(id: number) {
  await requireAuth();

  try {
    // Check if account has transactions
    const result = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
      [id]
    );

    if (result && result.count > 0) {
      return {
        success: false,
        error: `Cannot delete account with ${result.count} transaction(s)`,
      };
    }

    await execute('DELETE FROM accounts WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete account:', error);
    return {
      success: false,
      error: 'Failed to delete account',
    };
  }
}
