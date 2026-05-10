import { notFound, redirect } from 'next/navigation';
import { getAccountById } from '@/lib/db/accounts';
import { locales } from '@/lib/i18n/config';

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  if (!/^[1-9]\d*$/.test(resolvedParams.id)) {
    notFound();
  }

  const accountId = Number(resolvedParams.id);
  if (!Number.isInteger(accountId) || accountId > POSTGRES_INTEGER_MAX) {
    notFound();
  }

  const account = await getAccountById(accountId);
  if (!account) {
    notFound();
  }

  const paramsForRedirect = new URLSearchParams({
    accountId: account.id.toString(),
  });
  const lang = Array.isArray(resolvedSearchParams.lang)
    ? resolvedSearchParams.lang[0]
    : resolvedSearchParams.lang;

  if (lang && locales.includes(lang as (typeof locales)[number])) {
    paramsForRedirect.set('lang', lang);
  }

  redirect(`/transactions?${paramsForRedirect.toString()}`);
}
