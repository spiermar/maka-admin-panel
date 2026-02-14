import dotenv from 'dotenv';
import { resolve } from 'path';
import { queryOne, queryMany, execute } from '@/lib/db';

dotenv.config({ path: '.env.local' });

const args = process.argv.slice(2);
const isAllFlag = args.includes('--all');

async function getAccountId(identifier: string): Promise<number | null> {
  const isNumeric = /^\d+$/.test(identifier);
  
  if (isNumeric) {
    const account = await queryOne<{ id: number }>(
      'SELECT id FROM accounts WHERE id = $1',
      [parseInt(identifier, 10)]
    );
    return account?.id ?? null;
  }
  
  const account = await queryOne<{ id: number }>(
    'SELECT id FROM accounts WHERE name ILIKE $1',
    [identifier]
  );
  return account?.id ?? null;
}

async function cleanTransactions(accountIdentifier: string) {
  const accountId = await getAccountId(accountIdentifier);
  
  if (!accountId) {
    throw new Error(`Account not found: ${accountIdentifier}`);
  }

  const account = await queryOne<{ name: string }>(
    'SELECT name FROM accounts WHERE id = $1',
    [accountId]
  );

  console.log(`Cleaning transactions for account: ${account?.name} (ID: ${accountId})`);

  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM transactions WHERE account_id = $1',
    [accountId]
  );
  
  const transactionCount = parseInt(countResult?.count ?? '0', 10);
  
  if (transactionCount === 0) {
    console.log('No transactions to clean.');
    process.exit(0);
  }

  console.log(`Found ${transactionCount} transaction(s). Deleting...`);

  await execute(
    'DELETE FROM transactions WHERE account_id = $1',
    [accountId]
  );

  console.log(`✓ Successfully deleted ${transactionCount} transaction(s) from account "${account?.name}"`);
  process.exit(0);
}

async function cleanAllTransactions() {
  const accounts = await queryMany<{ id: number; name: string }>(
    'SELECT id, name FROM accounts ORDER BY name'
  );

  if (accounts.length === 0) {
    console.log('No accounts found.');
    process.exit(0);
  }

  const countResult = await queryOne<{ count: string }>(
    'SELECT COUNT(*) as count FROM transactions'
  );
  
  const totalCount = parseInt(countResult?.count ?? '0', 10);
  
  if (totalCount === 0) {
    console.log('No transactions to clean.');
    process.exit(0);
  }

  console.log(`Found ${totalCount} transaction(s) across ${accounts.length} account(s). Deleting...`);

  await execute('DELETE FROM transactions');

  console.log(`✓ Successfully deleted ${totalCount} transaction(s) from all accounts`);
  process.exit(0);
}

const accountIdentifier = args.find(arg => arg !== '--all');

if (isAllFlag) {
  cleanAllTransactions().catch((error) => {
    console.error('Error cleaning transactions:', error);
    process.exit(1);
  });
} else if (!accountIdentifier) {
  console.error('Usage: npm run script:clean-transactions -- <account-name-or-id>');
  console.error('       npm run script:clean-transactions -- --all');
  console.error('Example: npm run script:clean-transactions -- "Checking Account"');
  console.error('Example: npm run script:clean-transactions -- 1');
  console.error('Example: npm run script:clean-transactions -- --all');
  process.exit(1);
} else {
  cleanTransactions(accountIdentifier).catch((error) => {
    console.error('Error cleaning transactions:', error);
    process.exit(1);
  });
}