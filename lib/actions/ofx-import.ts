'use server';

import { revalidatePath } from 'next/cache';
import { queryOne, execute } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { OfxTransaction } from '@/lib/ofx/types';

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

async function transactionExists(
  accountId: number,
  date: string,
  fitid: string,
  amount: number
): Promise<boolean> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM transactions 
     WHERE account_id = $1 AND date = $2 AND ofx_fitid = $3 AND amount = $4`,
    [accountId, date, fitid, amount.toFixed(2)]
  );
  return existing !== null;
}

async function insertTransaction(
  accountId: number,
  tx: OfxTransaction
): Promise<void> {
  await execute(
    `INSERT INTO transactions 
     (account_id, date, payee, amount, comment, ofx_fitid, ofx_memo, ofx_refnum) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      accountId,
      tx.date,
      tx.refnum,
      tx.amount.toFixed(2),
      tx.memo,
      tx.fitid,
      tx.memo,
      tx.refnum,
    ]
  );
}

export async function importOfxTransactions(
  accountId: number,
  transactions: OfxTransaction[]
): Promise<ImportResult> {
  await requireAuth();

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    errors: [],
  };

  for (const tx of transactions) {
    try {
      const exists = await transactionExists(
        accountId,
        tx.date,
        tx.fitid,
        tx.amount
      );

      if (exists) {
        result.skipped++;
        continue;
      }

      await insertTransaction(accountId, tx);
      result.imported++;
    } catch (error) {
      result.errors.push(`Failed to import transaction ${tx.fitid}: ${error}`);
    }
  }

  revalidatePath(`/accounts/${accountId}`);

  return result;
}