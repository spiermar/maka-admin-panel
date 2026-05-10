export type AnalysisDatePreset =
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-90-days'
  | 'this-year'
  | 'ytd'
  | 'last-year'
  | 'custom';

export type AnalysisGrouping = 'adaptive' | 'daily' | 'weekly' | 'monthly';
export type ResolvedAnalysisGrouping = Exclude<AnalysisGrouping, 'adaptive'>;

type QueryValue = string | string[] | undefined;
export type AnalysisFilterSearchParams = Record<string, QueryValue>;

export interface AnalysisFilters {
  preset: AnalysisDatePreset;
  from: string;
  to: string;
  accountId?: number;
  grouping: AnalysisGrouping;
  resolvedGrouping: ResolvedAnalysisGrouping;
  includedCategoryIds: number[];
  hasCategoryFilter: boolean;
  includeUncategorizedIncome: boolean;
  includeUncategorizedExpense: boolean;
  hasInvalidDateRange: boolean;
}

interface ResolvedAnalysisDateRange {
  preset: AnalysisDatePreset;
  from: string;
  to: string;
  hasInvalidDateRange: boolean;
}

interface ResolveAnalysisDateRangeInput {
  preset?: QueryValue;
  from?: QueryValue;
  to?: QueryValue;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_INTEGER_RE = /^\d+$/;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const DATE_PRESETS: AnalysisDatePreset[] = [
  'this-month',
  'last-month',
  'last-3-months',
  'last-90-days',
  'this-year',
  'ytd',
  'last-year',
  'custom',
];

const GROUPINGS: AnalysisGrouping[] = ['adaptive', 'daily', 'weekly', 'monthly'];

function firstValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function allValues(value: QueryValue): string[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined ? [] : [value];
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const targetFirst = new Date(Date.UTC(year, month, 1));
  const targetYear = targetFirst.getUTCFullYear();
  const targetMonth = targetFirst.getUTCMonth();
  const targetDay = Math.min(day, daysInUtcMonth(targetYear, targetMonth));

  return new Date(Date.UTC(targetYear, targetMonth, targetDay));
}

function parsePositiveIntegerValue(raw: string | undefined): number | undefined {
  if (!raw || !POSITIVE_INTEGER_RE.test(raw)) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= POSTGRES_INTEGER_MAX
    ? parsed
    : undefined;
}

function parsePositiveInteger(value: QueryValue): number | undefined {
  return parsePositiveIntegerValue(firstValue(value));
}

function parsePositiveIntegerList(value: QueryValue): number[] {
  const ids = allValues(value)
    .flatMap((raw) => raw.split(','))
    .map((raw) => parsePositiveIntegerValue(raw.trim()))
    .filter((id): id is number => id !== undefined);

  return [...new Set(ids)].sort((a, b) => a - b);
}

function parseIsoDate(value: QueryValue): string | undefined {
  const raw = firstValue(value);
  if (!raw || !ISO_DATE_RE.test(raw)) {
    return undefined;
  }

  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw
    ? undefined
    : raw;
}

function parsePreset(value: QueryValue): AnalysisDatePreset {
  const raw = firstValue(value);
  return raw && DATE_PRESETS.includes(raw as AnalysisDatePreset)
    ? (raw as AnalysisDatePreset)
    : 'last-3-months';
}

function parseGrouping(value: QueryValue): AnalysisGrouping {
  const raw = firstValue(value);
  return raw && GROUPINGS.includes(raw as AnalysisGrouping)
    ? (raw as AnalysisGrouping)
    : 'adaptive';
}

function parseIncludedBoolean(value: QueryValue): boolean {
  const raw = firstValue(value);
  if (raw === '0' || raw === 'false') {
    return false;
  }
  if (raw === '1' || raw === 'true') {
    return true;
  }

  return true;
}

function fallbackLastThreeMonths(): ResolvedAnalysisDateRange {
  const today = todayUtc();

  return {
    preset: 'last-3-months',
    from: formatUtcDate(addUtcMonths(today, -3)),
    to: formatUtcDate(today),
    hasInvalidDateRange: false,
  };
}

export function resolveAnalysisDateRange(
  input: ResolveAnalysisDateRangeInput
): ResolvedAnalysisDateRange {
  const preset = parsePreset(input.preset);
  const today = todayUtc();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();

  if (preset === 'custom') {
    const from = parseIsoDate(input.from);
    const to = parseIsoDate(input.to);

    if (!from || !to) {
      return fallbackLastThreeMonths();
    }

    return {
      preset,
      from,
      to,
      hasInvalidDateRange: from > to,
    };
  }

  if (preset === 'this-month') {
    return {
      preset,
      from: formatUtcDate(new Date(Date.UTC(year, month, 1))),
      to: formatUtcDate(today),
      hasInvalidDateRange: false,
    };
  }

  if (preset === 'last-month') {
    return {
      preset,
      from: formatUtcDate(new Date(Date.UTC(year, month - 1, 1))),
      to: formatUtcDate(new Date(Date.UTC(year, month, 0))),
      hasInvalidDateRange: false,
    };
  }

  if (preset === 'last-90-days') {
    return {
      preset,
      from: formatUtcDate(new Date(today.getTime() - 90 * MS_PER_DAY)),
      to: formatUtcDate(today),
      hasInvalidDateRange: false,
    };
  }

  if (preset === 'this-year' || preset === 'ytd') {
    return {
      preset,
      from: formatUtcDate(new Date(Date.UTC(year, 0, 1))),
      to: formatUtcDate(today),
      hasInvalidDateRange: false,
    };
  }

  if (preset === 'last-year') {
    return {
      preset,
      from: formatUtcDate(new Date(Date.UTC(year - 1, 0, 1))),
      to: formatUtcDate(new Date(Date.UTC(year - 1, 11, 31))),
      hasInvalidDateRange: false,
    };
  }

  return fallbackLastThreeMonths();
}

export function resolveAnalysisGrouping(
  grouping: AnalysisGrouping,
  from: string,
  to: string
): ResolvedAnalysisGrouping {
  if (grouping !== 'adaptive') {
    return grouping;
  }

  const fromTime = new Date(`${from}T00:00:00Z`).getTime();
  const toTime = new Date(`${to}T00:00:00Z`).getTime();
  const inclusiveDays = Math.floor((toTime - fromTime) / MS_PER_DAY) + 1;

  if (inclusiveDays <= 45) {
    return 'daily';
  }
  if (inclusiveDays <= 180) {
    return 'weekly';
  }

  return 'monthly';
}

export function parseAnalysisFilters(searchParams: AnalysisFilterSearchParams): AnalysisFilters {
  const dateRange = resolveAnalysisDateRange({
    preset: searchParams.preset,
    from: searchParams.from,
    to: searchParams.to,
  });
  const grouping = parseGrouping(searchParams.grouping);
  const accountId = parsePositiveInteger(searchParams.accountId);
  const filters: AnalysisFilters = {
    ...dateRange,
    grouping,
    resolvedGrouping: resolveAnalysisGrouping(grouping, dateRange.from, dateRange.to),
    includedCategoryIds: parsePositiveIntegerList(searchParams.categories),
    hasCategoryFilter: searchParams.categories !== undefined,
    includeUncategorizedIncome: parseIncludedBoolean(searchParams.uncategorizedIncome),
    includeUncategorizedExpense: parseIncludedBoolean(searchParams.uncategorizedExpense),
  };

  if (accountId) {
    filters.accountId = accountId;
  }

  return filters;
}
