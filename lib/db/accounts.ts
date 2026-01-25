import { queryMany, queryOne } from './index';
import { Account } from './types';

export async function getAllAccounts(): Promise<Account[]> {
  return queryMany<Account>(
    'SELECT * FROM accounts ORDER BY name ASC'
  );
}

export async function getAccountById(id: number): Promise<Account | null> {
  return queryOne<Account>(
    'SELECT * FROM accounts WHERE id = $1',
    [id]
  );
}

export async function getAccountBalance(accountId: number): Promise<string> {
  const result = await queryOne<{ balance: string }>(
    `SELECT COALESCE(SUM(amount), 0)::decimal(15,2) as balance
     FROM transactions
     WHERE account_id = $1`,
    [accountId]
  );
  return result?.balance || '0.00';
}

export interface AccountWithBalance extends Account {
  balance: string;
}

export async function getAllAccountsWithBalances(): Promise<AccountWithBalance[]> {
  return queryMany<AccountWithBalance>(
    `SELECT
       a.id,
       a.name,
       a.created_at,
       COALESCE(SUM(t.amount), 0)::decimal(15,2) as balance
     FROM accounts a
     LEFT JOIN transactions t ON a.id = t.account_id
     GROUP BY a.id, a.name, a.created_at
     ORDER BY a.name ASC`
  );
}
