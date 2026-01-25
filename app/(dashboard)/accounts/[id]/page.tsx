import { notFound } from 'next/navigation';
import { getAccountById, getAccountBalance } from '@/lib/db/accounts';
import { getTransactionsByAccount } from '@/lib/db/transactions';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { AccountDetailClient } from './client';

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const accountId = parseInt(resolvedParams.id);

  const [account, balance, transactions, accounts, categories] =
    await Promise.all([
      getAccountById(accountId),
      getAccountBalance(accountId),
      getTransactionsByAccount(accountId),
      getAllAccounts(),
      getAllCategoriesWithPaths(),
    ]);

  if (!account) {
    notFound();
  }

  return (
    <AccountDetailClient
      account={account}
      balance={balance}
      transactions={transactions}
      accounts={accounts}
      categories={categories}
    />
  );
}
