import {
  parseAnalysisFilters,
  type AnalysisFilterSearchParams,
} from '@/lib/analysis/filters';
import { getTransactionAnalysis } from '@/lib/analytics/transaction-analysis';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { AnalysisClient } from './client';

export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<AnalysisFilterSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const parsedFilters = parseAnalysisFilters(resolvedSearchParams);

  const [lang, accounts, categories] = await Promise.all([
    getLangFromUrl(),
    getAllAccounts(),
    getAllCategoriesWithPaths(),
  ]);

  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const filters = {
    ...parsedFilters,
    accountId:
      parsedFilters.accountId && validAccountIds.has(parsedFilters.accountId)
        ? parsedFilters.accountId
        : undefined,
    includedCategoryIds: parsedFilters.includedCategoryIds.filter((categoryId) =>
      validCategoryIds.has(categoryId)
    ),
  };

  const data = await getTransactionAnalysis(filters);

  return (
    <AnalysisClient
      accounts={accounts}
      categories={categories}
      filters={filters}
      data={data}
      lang={lang}
    />
  );
}
