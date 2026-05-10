import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning, queryOne } from '@/lib/db';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/lib/actions/transactions';
import { importOfxTransactions } from '@/lib/actions/ofx-import';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  executeReturning: vi.fn(),
  queryOne: vi.fn(),
}));

function validTransactionFormData(accountId = '3') {
  const formData = new FormData();
  formData.append('account_id', accountId);
  formData.append('date', '2026-05-10');
  formData.append('payee', 'Utility Co');
  formData.append('category_id', 'none');
  formData.append('amount', '-42.50');
  formData.append('comment', 'Monthly bill');
  return formData;
}

describe('Task 5 action revalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      username: 'admin',
      sessionVersion: 1,
    });
    vi.mocked(execute).mockResolvedValue(undefined);
    vi.mocked(executeReturning).mockResolvedValue({
      id: 1,
      account_id: 3,
      date: '2026-05-10',
      payee: 'Utility Co',
      category_id: null,
      amount: '-42.50',
      comment: 'Monthly bill',
      ofx_fitid: null,
      ofx_memo: null,
      ofx_refnum: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    vi.mocked(queryOne).mockResolvedValue(null);
  });

  it('revalidates account list after creating a transaction', async () => {
    const result = await createTransaction(validTransactionFormData());

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/transactions');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts/3');
  });

  it('revalidates account list after updating a transaction', async () => {
    const result = await updateTransaction(12, validTransactionFormData('4'));

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/transactions');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts/4');
  });

  it('revalidates account list after deleting a transaction', async () => {
    const result = await deleteTransaction(12, 5);

    expect(result).toEqual({ success: true });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/transactions');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts/5');
  });

  it('revalidates dashboard, transactions, account list, and account after importing OFX', async () => {
    const result = await importOfxTransactions(9, [
      {
        fitid: 'fitid-1',
        refnum: 'ref-1',
        memo: 'Coffee',
        payee: 'Coffee Shop',
        cleanedMemo: 'Coffee Shop',
        date: '2026-05-10',
        amount: -5.25,
        type: 'DEBIT',
      },
    ]);

    expect(result).toEqual({ imported: 1, skipped: 0, errors: [] });
    expect(revalidatePath).toHaveBeenCalledWith('/');
    expect(revalidatePath).toHaveBeenCalledWith('/transactions');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts');
    expect(revalidatePath).toHaveBeenCalledWith('/accounts/9');
  });
});
