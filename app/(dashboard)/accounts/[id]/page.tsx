import { notFound, redirect } from 'next/navigation';
import { getAccountById } from '@/lib/db/accounts';

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const accountId = Number.parseInt(resolvedParams.id, 10);

  if (!Number.isInteger(accountId)) {
    notFound();
  }

  const account = await getAccountById(accountId);
  if (!account) {
    notFound();
  }

  const paramsForRedirect = new URLSearchParams({
    accountId: account.id.toString(),
  });

  if (resolvedSearchParams.lang) {
    paramsForRedirect.set('lang', resolvedSearchParams.lang);
  }

  redirect(`/transactions?${paramsForRedirect.toString()}`);
}
