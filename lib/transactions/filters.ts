import { defaultLocale, locales, type Locale } from '@/lib/i18n/config';

export interface TransactionFilters {
  accountId?: number;
  categoryId?: number;
  from?: string;
  to?: string;
  q?: string;
}

export interface ParsedTransactionFilters {
  filters: TransactionFilters;
  lang: Locale;
  hasInvalidDateRange: boolean;
}

type QueryValue = string | string[] | undefined;
export type TransactionFilterSearchParams = Record<string, QueryValue>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parsePositiveInteger(value: QueryValue): number | undefined {
  const raw = firstValue(value);
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIsoDate(value: QueryValue): string | undefined {
  const raw = firstValue(value);
  if (!raw || !ISO_DATE_RE.test(raw)) {
    return undefined;
  }

  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : raw;
}

function parseSearch(value: QueryValue): string | undefined {
  const raw = firstValue(value)?.trim();
  return raw ? raw : undefined;
}

function parseLocale(value: QueryValue): Locale {
  const raw = firstValue(value);
  return raw && locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;
}

export function parseTransactionFilters(
  searchParams: TransactionFilterSearchParams
): ParsedTransactionFilters {
  const filters: TransactionFilters = {};
  const accountId = parsePositiveInteger(searchParams.accountId);
  const categoryId = parsePositiveInteger(searchParams.categoryId);
  const from = parseIsoDate(searchParams.from);
  const to = parseIsoDate(searchParams.to);
  const q = parseSearch(searchParams.q);

  if (accountId) {
    filters.accountId = accountId;
  }
  if (categoryId) {
    filters.categoryId = categoryId;
  }
  if (from) {
    filters.from = from;
  }
  if (to) {
    filters.to = to;
  }
  if (q) {
    filters.q = q;
  }

  return {
    filters,
    lang: parseLocale(searchParams.lang),
    hasInvalidDateRange: !!from && !!to && from > to,
  };
}
