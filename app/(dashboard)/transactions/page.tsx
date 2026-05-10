import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { getTransactions } from '@/lib/db/transactions';
import {
  parseTransactionFilters,
  TransactionFilterSearchParams,
} from '@/lib/transactions/filters';
import { TransactionsClient } from './client';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionFilterSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const parsed = parseTransactionFilters(resolvedSearchParams);

  const [accounts, categories] = await Promise.all([
    getAllAccounts(),
    getAllCategoriesWithPaths(),
  ]);

  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const filters = {
    ...parsed.filters,
    accountId:
      parsed.filters.accountId && validAccountIds.has(parsed.filters.accountId)
        ? parsed.filters.accountId
        : undefined,
    categoryId:
      parsed.filters.categoryId && validCategoryIds.has(parsed.filters.categoryId)
        ? parsed.filters.categoryId
        : undefined,
  };

  const transactions = parsed.hasInvalidDateRange
    ? []
    : await getTransactions(filters);

  return (
    <TransactionsClient
      accounts={accounts}
      categories={categories}
      transactions={transactions}
      filters={filters}
      lang={parsed.lang}
    />
  );
}
