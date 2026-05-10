# Transaction Analysis View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated `/analysis` page that analyzes selected-range income and expense trends with date, account, grouping, and hierarchy-aware category filters.

**Architecture:** Add URL-driven filter parsing in `lib/analysis/filters.ts`, page-specific analytics in `lib/analytics/transaction-analysis.ts`, and a protected App Router page at `app/(dashboard)/analysis`. The server page validates IDs and fetches data; focused client components render filters, Recharts visualizations, and the trend table.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Recharts, PostgreSQL via `@vercel/postgres`, next-intl, Vitest, Testing Library, Playwright.

---

## Approved Spec

Implement the approved design in `docs/superpowers/specs/2026-05-10-transaction-analysis-design.md`.

## File Structure

Create:

- `lib/analysis/filters.ts` - Parse and resolve analysis URL filters.
- `__tests__/lib/analysis/filters.test.ts` - Unit tests for presets, custom dates, grouping, IDs, and invalid ranges.
- `lib/analytics/transaction-analysis.ts` - Query and shape transaction analysis data.
- `__tests__/lib/analytics/transaction-analysis.test.ts` - Unit tests for analytics SQL calls and shaping helpers.
- `components/analysis/analysis-summary-cards.tsx` - Income and expense total cards.
- `components/analysis/income-expense-trend-chart.tsx` - Grouped bar chart for income vs expenses.
- `components/analysis/category-breakdown-chart.tsx` - Horizontal bar chart for selected-range category totals.
- `components/analysis/category-stacked-trend-chart.tsx` - Stacked bar chart for top 10 categories plus Other.
- `components/analysis/category-trend-table.tsx` - Exact category totals by period.
- `components/analysis/analysis-category-filter.tsx` - Hierarchy-aware category checkbox tree.
- `app/(dashboard)/analysis/page.tsx` - Server component for route composition.
- `app/(dashboard)/analysis/client.tsx` - Client component for filters, URL updates, and layout.
- `__tests__/components/analysis/analysis-category-filter.test.tsx` - Category tree behavior tests.
- `__tests__/app/analysis-client.test.tsx` - URL update and rendering tests.
- `e2e/11-analysis.spec.ts` - E2E coverage for the new route and filters.

Modify:

- `components/dashboard/nav.tsx` - Add Analysis navigation link.
- `messages/en.json` - Add `nav.analysis` and `analysis.*` strings.
- `messages/pt-BR.json` - Add Portuguese equivalents.

Do not modify the existing dashboard charts except for shared utility extraction if a test makes that necessary.

## Task 1: Analysis Filter Parser

**Files:**

- Create: `lib/analysis/filters.ts`
- Create: `__tests__/lib/analysis/filters.test.ts`

- [ ] **Step 1: Write failing filter parser tests**

Create `__tests__/lib/analysis/filters.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  parseAnalysisFilters,
  resolveAnalysisDateRange,
  resolveAnalysisGrouping,
} from '@/lib/analysis/filters';

describe('analysis filters', () => {
  it('defaults to last 3 months, all accounts, all categories, and adaptive grouping', () => {
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

    const parsed = parseAnalysisFilters({});

    expect(parsed.preset).toBe('last-3-months');
    expect(parsed.accountId).toBeUndefined();
    expect(parsed.grouping).toBe('adaptive');
    expect(parsed.includedCategoryIds).toEqual([]);
    expect(parsed.includeUncategorizedIncome).toBe(true);
    expect(parsed.includeUncategorizedExpense).toBe(true);
    expect(parsed.hasCategoryFilter).toBe(false);
    expect(parsed.hasInvalidDateRange).toBe(false);
    expect(parsed.from).toBe('2026-02-10');
    expect(parsed.to).toBe('2026-05-10');
  });

  it('resolves fixed presets from the current date', () => {
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

    expect(resolveAnalysisDateRange({ preset: 'this-month' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-10',
      preset: 'this-month',
    });
    expect(resolveAnalysisDateRange({ preset: 'last-month' })).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
      preset: 'last-month',
    });
    expect(resolveAnalysisDateRange({ preset: 'last-year' })).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
      preset: 'last-year',
    });
  });

  it('uses custom dates when both custom dates are valid', () => {
    const parsed = parseAnalysisFilters({
      preset: 'custom',
      from: '2026-01-15',
      to: '2026-03-20',
    });

    expect(parsed.preset).toBe('custom');
    expect(parsed.from).toBe('2026-01-15');
    expect(parsed.to).toBe('2026-03-20');
    expect(parsed.hasInvalidDateRange).toBe(false);
  });

  it('marks reversed custom ranges invalid', () => {
    const parsed = parseAnalysisFilters({
      preset: 'custom',
      from: '2026-03-20',
      to: '2026-01-15',
    });

    expect(parsed.hasInvalidDateRange).toBe(true);
    expect(parsed.from).toBe('2026-03-20');
    expect(parsed.to).toBe('2026-01-15');
  });

  it('falls back to last 3 months when custom dates are missing', () => {
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

    const parsed = parseAnalysisFilters({ preset: 'custom', from: '2026-01-01' });

    expect(parsed.preset).toBe('last-3-months');
    expect(parsed.from).toBe('2026-02-10');
    expect(parsed.to).toBe('2026-05-10');
  });

  it('parses valid account, category IDs, grouping, and uncategorized flags', () => {
    const parsed = parseAnalysisFilters({
      accountId: '2',
      grouping: 'weekly',
      categories: '4,7,9',
      uncategorizedIncome: '0',
      uncategorizedExpense: '1',
    });

    expect(parsed.accountId).toBe(2);
    expect(parsed.grouping).toBe('weekly');
    expect(parsed.includedCategoryIds).toEqual([4, 7, 9]);
    expect(parsed.hasCategoryFilter).toBe(true);
    expect(parsed.includeUncategorizedIncome).toBe(false);
    expect(parsed.includeUncategorizedExpense).toBe(true);
  });

  it('ignores malformed IDs and unknown grouping values', () => {
    const parsed = parseAnalysisFilters({
      accountId: '-1',
      grouping: 'quarterly',
      categories: 'abc,3,9007199254740993,3',
    });

    expect(parsed.accountId).toBeUndefined();
    expect(parsed.grouping).toBe('adaptive');
    expect(parsed.includedCategoryIds).toEqual([3]);
  });

  it('resolves adaptive grouping by range length', () => {
    expect(resolveAnalysisGrouping('adaptive', '2026-05-01', '2026-05-31')).toBe('daily');
    expect(resolveAnalysisGrouping('adaptive', '2026-01-01', '2026-05-31')).toBe('weekly');
    expect(resolveAnalysisGrouping('adaptive', '2025-01-01', '2026-05-31')).toBe('monthly');
    expect(resolveAnalysisGrouping('monthly', '2026-05-01', '2026-05-31')).toBe('monthly');
  });
});
```

- [ ] **Step 2: Run parser tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/lib/analysis/filters.test.ts
```

Expected: FAIL because `lib/analysis/filters.ts` does not exist.

- [ ] **Step 3: Implement the parser**

Create `lib/analysis/filters.ts`:

```ts
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

type QueryValue = string | string[] | undefined;
export type AnalysisFilterSearchParams = Record<string, QueryValue>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_INTEGER_RE = /^\d+$/;
const POSTGRES_INTEGER_MAX = 2_147_483_647;
const PRESETS = new Set<AnalysisDatePreset>([
  'this-month',
  'last-month',
  'last-3-months',
  'last-90-days',
  'this-year',
  'ytd',
  'last-year',
  'custom',
]);
const GROUPINGS = new Set<AnalysisGrouping>(['adaptive', 'daily', 'weekly', 'monthly']);

function firstValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function parseIsoDate(value: QueryValue): string | undefined {
  const raw = firstValue(value);
  if (!raw || !ISO_DATE_RE.test(raw)) return undefined;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || toIsoDate(parsed) !== raw ? undefined : raw;
}

function parsePositiveInteger(value: QueryValue): number | undefined {
  const raw = firstValue(value);
  if (!raw || !POSITIVE_INTEGER_RE.test(raw)) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return parsed > 0 && parsed <= POSTGRES_INTEGER_MAX ? parsed : undefined;
}

function parseBooleanFlag(value: QueryValue, defaultValue: boolean): boolean {
  const raw = firstValue(value);
  if (raw === '0' || raw === 'false') return false;
  if (raw === '1' || raw === 'true') return true;
  return defaultValue;
}

function parsePreset(value: QueryValue): AnalysisDatePreset {
  const raw = firstValue(value);
  return raw && PRESETS.has(raw as AnalysisDatePreset)
    ? (raw as AnalysisDatePreset)
    : 'last-3-months';
}

function parseGrouping(value: QueryValue): AnalysisGrouping {
  const raw = firstValue(value);
  return raw && GROUPINGS.has(raw as AnalysisGrouping)
    ? (raw as AnalysisGrouping)
    : 'adaptive';
}

function parseCategoryIds(value: QueryValue): number[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((part) => parsePositiveInteger(part.trim()))
        .filter((id): id is number => id !== undefined)
    )
  ).sort((a, b) => a - b);
}

export function resolveAnalysisDateRange(input: {
  preset?: AnalysisDatePreset;
  from?: string;
  to?: string;
}): { preset: AnalysisDatePreset; from: string; to: string } {
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const preset = input.preset ?? 'last-3-months';

  if (preset === 'custom' && input.from && input.to) {
    return { preset, from: input.from, to: input.to };
  }

  if (preset === 'this-month') {
    return { preset, from: toIsoDate(startOfUtcMonth(todayUtc)), to: toIsoDate(todayUtc) };
  }
  if (preset === 'last-month') {
    const firstThisMonth = startOfUtcMonth(todayUtc);
    const firstLastMonth = addUtcMonths(firstThisMonth, -1);
    return { preset, from: toIsoDate(firstLastMonth), to: toIsoDate(addUtcDays(firstThisMonth, -1)) };
  }
  if (preset === 'last-90-days') {
    return { preset, from: toIsoDate(addUtcDays(todayUtc, -90)), to: toIsoDate(todayUtc) };
  }
  if (preset === 'this-year' || preset === 'ytd') {
    return { preset, from: toIsoDate(startOfUtcYear(todayUtc)), to: toIsoDate(todayUtc) };
  }
  if (preset === 'last-year') {
    const year = todayUtc.getUTCFullYear() - 1;
    return { preset, from: `${year}-01-01`, to: `${year}-12-31` };
  }

  return {
    preset: 'last-3-months',
    from: toIsoDate(addUtcMonths(todayUtc, -3)),
    to: toIsoDate(todayUtc),
  };
}

function inclusiveDayCount(from: string, to: string): number {
  const fromMs = new Date(`${from}T00:00:00Z`).getTime();
  const toMs = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((toMs - fromMs) / 86_400_000) + 1;
}

export function resolveAnalysisGrouping(
  grouping: AnalysisGrouping,
  from: string,
  to: string
): ResolvedAnalysisGrouping {
  if (grouping !== 'adaptive') return grouping;
  const days = inclusiveDayCount(from, to);
  if (days <= 45) return 'daily';
  if (days <= 180) return 'weekly';
  return 'monthly';
}

export function parseAnalysisFilters(searchParams: AnalysisFilterSearchParams): AnalysisFilters {
  const requestedPreset = parsePreset(searchParams.preset);
  const customFrom = parseIsoDate(searchParams.from);
  const customTo = parseIsoDate(searchParams.to);
  const range = resolveAnalysisDateRange({
    preset: requestedPreset,
    from: customFrom,
    to: customTo,
  });
  const grouping = parseGrouping(searchParams.grouping);
  const includedCategoryIds = parseCategoryIds(searchParams.categories);
  const hasInvalidDateRange = range.from > range.to;

  return {
    preset: range.preset,
    from: range.from,
    to: range.to,
    accountId: parsePositiveInteger(searchParams.accountId),
    grouping,
    resolvedGrouping: resolveAnalysisGrouping(grouping, range.from, range.to),
    includedCategoryIds,
    hasCategoryFilter: firstValue(searchParams.categories) !== undefined,
    includeUncategorizedIncome: parseBooleanFlag(searchParams.uncategorizedIncome, true),
    includeUncategorizedExpense: parseBooleanFlag(searchParams.uncategorizedExpense, true),
    hasInvalidDateRange,
  };
}
```

- [ ] **Step 4: Run parser tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/lib/analysis/filters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit parser work**

```bash
git add lib/analysis/filters.ts __tests__/lib/analysis/filters.test.ts
git commit -m "feat: add analysis filter parser"
```

## Task 2: Transaction Analysis Analytics

**Files:**

- Create: `lib/analytics/transaction-analysis.ts`
- Create: `__tests__/lib/analytics/transaction-analysis.test.ts`

- [ ] **Step 1: Write failing analytics tests**

Create `__tests__/lib/analytics/transaction-analysis.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAnalysisWhereClause,
  getTransactionAnalysis,
  groupStackedTrendRows,
} from '@/lib/analytics/transaction-analysis';
import { AnalysisFilters } from '@/lib/analysis/filters';

vi.mock('@/lib/db', () => ({
  queryMany: vi.fn(),
  queryOne: vi.fn(),
}));

const filters: AnalysisFilters = {
  preset: 'last-3-months',
  from: '2026-02-10',
  to: '2026-05-10',
  accountId: 2,
  grouping: 'adaptive',
  resolvedGrouping: 'weekly',
  includedCategoryIds: [4, 7],
  hasCategoryFilter: true,
  includeUncategorizedIncome: true,
  includeUncategorizedExpense: false,
  hasInvalidDateRange: false,
};

describe('transaction analysis analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a parameterized where clause for date, account, categories, and uncategorized flags', () => {
    const where = buildAnalysisWhereClause(filters);

    expect(where.whereSql).toContain('t.date >= $1');
    expect(where.whereSql).toContain('t.date <= $2');
    expect(where.whereSql).toContain('t.account_id = $3');
    expect(where.whereSql).toContain('t.category_id = ANY($4::int[])');
    expect(where.whereSql).toContain('t.category_id IS NULL AND t.amount > 0');
    expect(where.whereSql).not.toContain('t.category_id IS NULL AND t.amount < 0');
    expect(where.params).toEqual(['2026-02-10', '2026-05-10', 2, [4, 7]]);
  });

  it('returns empty analysis without querying when range is invalid', async () => {
    const { queryMany, queryOne } = await import('@/lib/db');

    const result = await getTransactionAnalysis({
      ...filters,
      hasInvalidDateRange: true,
    });

    expect(result.summary).toEqual({ income: '0.00', expenses: '0.00' });
    expect(result.incomeExpenseTrend).toEqual([]);
    expect(queryOne).not.toHaveBeenCalled();
    expect(queryMany).not.toHaveBeenCalled();
  });

  it('fetches summary, trend, breakdowns, stacked trends, and table data', async () => {
    const { queryMany, queryOne } = await import('@/lib/db');
    vi.mocked(queryOne).mockResolvedValue({ income: '1000.00', expenses: '450.00' });
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ period: '2026-05-04', income: '1000.00', expenses: '450.00' }])
      .mockResolvedValueOnce([{ category_id: 7, category_name: 'Rent', category_path: 'Housing > Rent', amount: '400.00' }])
      .mockResolvedValueOnce([{ category_id: 4, category_name: 'Salary', category_path: 'Salary', amount: '1000.00' }])
      .mockResolvedValueOnce([{ period: '2026-05-04', category_key: '7', category_path: 'Housing > Rent', amount: '400.00' }])
      .mockResolvedValueOnce([{ period: '2026-05-04', category_key: '4', category_path: 'Salary', amount: '1000.00' }])
      .mockResolvedValueOnce([{ category_key: '7', category_type: 'expense', category_path: 'Housing > Rent', period: '2026-05-04', amount: '400.00' }]);

    const result = await getTransactionAnalysis(filters);

    expect(result.summary).toEqual({ income: '1000.00', expenses: '450.00' });
    expect(result.expenseBreakdown[0].percentage).toBe(100);
    expect(result.incomeBreakdown[0].percentage).toBe(100);
    expect(result.expenseStackedTrend[0]).toMatchObject({
      period: '2026-05-04',
      'Housing > Rent': 400,
    });
    expect(result.categoryTrendRows[0].total).toBe(400);
    expect(queryOne).toHaveBeenCalledTimes(1);
    expect(queryMany).toHaveBeenCalledTimes(6);
  });

  it('groups stacked rows into top 10 categories plus Other', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      period: '2026-05',
      category_key: String(index + 1),
      category_path: `Category ${index + 1}`,
      amount: String(120 - index),
    }));

    const result = groupStackedTrendRows(rows);

    expect(Object.keys(result[0]).filter((key) => key !== 'period')).toHaveLength(11);
    expect(result[0].Other).toBe(109 + 108);
    expect(result[0]['Category 1']).toBe(120);
  });
});
```

- [ ] **Step 2: Run analytics tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/lib/analytics/transaction-analysis.test.ts
```

Expected: FAIL because `lib/analytics/transaction-analysis.ts` does not exist.

- [ ] **Step 3: Implement analytics types and helpers**

Create `lib/analytics/transaction-analysis.ts` with these exports and helper signatures:

```ts
import { queryMany, queryOne } from '@/lib/db';
import { AnalysisFilters, ResolvedAnalysisGrouping } from '@/lib/analysis/filters';

export interface AnalysisSummary {
  income: string;
  expenses: string;
}

export interface IncomeExpenseTrendPoint {
  period: string;
  income: string;
  expenses: string;
}

export interface AnalysisCategoryBreakdown {
  category_id: number | null;
  category_name: string;
  category_path: string;
  amount: string;
  percentage: number;
}

interface RawStackedTrendRow {
  period: string;
  category_key: string;
  category_path: string;
  amount: string;
}

export interface StackedTrendPoint {
  period: string;
  [categoryPath: string]: string | number;
}

interface RawCategoryTrendRow {
  category_key: string;
  category_type: 'income' | 'expense';
  category_path: string;
  period: string;
  amount: string;
}

export interface CategoryTrendRow {
  categoryKey: string;
  categoryType: 'income' | 'expense';
  categoryPath: string;
  total: number;
  periods: Record<string, number>;
}

export interface TransactionAnalysisData {
  summary: AnalysisSummary;
  incomeExpenseTrend: IncomeExpenseTrendPoint[];
  expenseBreakdown: AnalysisCategoryBreakdown[];
  incomeBreakdown: AnalysisCategoryBreakdown[];
  expenseStackedTrend: StackedTrendPoint[];
  incomeStackedTrend: StackedTrendPoint[];
  categoryTrendRows: CategoryTrendRow[];
}

export function emptyTransactionAnalysis(): TransactionAnalysisData {
  return {
    summary: { income: '0.00', expenses: '0.00' },
    incomeExpenseTrend: [],
    expenseBreakdown: [],
    incomeBreakdown: [],
    expenseStackedTrend: [],
    incomeStackedTrend: [],
    categoryTrendRows: [],
  };
}

export function periodExpression(grouping: ResolvedAnalysisGrouping): string {
  if (grouping === 'daily') return "TO_CHAR(t.date, 'YYYY-MM-DD')";
  if (grouping === 'weekly') return "TO_CHAR(DATE_TRUNC('week', t.date), 'YYYY-MM-DD')";
  return "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')";
}

export function buildAnalysisWhereClause(filters: AnalysisFilters): {
  whereSql: string;
  params: Array<string | number | number[]>;
} {
  const clauses = ['t.date >= $1', 't.date <= $2'];
  const params: Array<string | number | number[]> = [filters.from, filters.to];

  if (filters.accountId) {
    params.push(filters.accountId);
    clauses.push(`t.account_id = $${params.length}`);
  }

  if (filters.hasCategoryFilter) {
    const categoryClauses: string[] = [];
    if (filters.includedCategoryIds.length > 0) {
      params.push(filters.includedCategoryIds);
      categoryClauses.push(`t.category_id = ANY($${params.length}::int[])`);
    }
    if (filters.includeUncategorizedIncome) {
      categoryClauses.push('(t.category_id IS NULL AND t.amount > 0)');
    }
    if (filters.includeUncategorizedExpense) {
      categoryClauses.push('(t.category_id IS NULL AND t.amount < 0)');
    }
    clauses.push(categoryClauses.length > 0 ? `(${categoryClauses.join(' OR ')})` : 'FALSE');
  }

  return { whereSql: `WHERE ${clauses.join(' AND ')}`, params };
}
```

- [ ] **Step 4: Implement data shaping helpers**

Add these functions to `lib/analytics/transaction-analysis.ts`:

```ts
function addPercentages(
  rows: Array<Omit<AnalysisCategoryBreakdown, 'percentage'>>
): AnalysisCategoryBreakdown[] {
  const total = rows.reduce((sum, row) => sum + Number.parseFloat(row.amount), 0);
  return rows.map((row) => ({
    ...row,
    percentage: total > 0 ? (Number.parseFloat(row.amount) / total) * 100 : 0,
  }));
}

export function groupStackedTrendRows(rows: RawStackedTrendRow[]): StackedTrendPoint[] {
  const totals = new Map<string, { path: string; total: number }>();
  for (const row of rows) {
    const amount = Number.parseFloat(row.amount);
    const current = totals.get(row.category_key) ?? { path: row.category_path, total: 0 };
    totals.set(row.category_key, { path: row.category_path, total: current.total + amount });
  }

  const topKeys = new Set(
    Array.from(totals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([key]) => key)
  );

  const byPeriod = new Map<string, StackedTrendPoint>();
  for (const row of rows) {
    const point = byPeriod.get(row.period) ?? { period: row.period };
    const stackKey = topKeys.has(row.category_key) ? row.category_path : 'Other';
    point[stackKey] = Number(point[stackKey] ?? 0) + Number.parseFloat(row.amount);
    byPeriod.set(row.period, point);
  }

  return Array.from(byPeriod.values()).sort((a, b) =>
    String(a.period).localeCompare(String(b.period))
  );
}

function groupCategoryTrendRows(rows: RawCategoryTrendRow[]): CategoryTrendRow[] {
  const grouped = new Map<string, CategoryTrendRow>();
  for (const row of rows) {
    const existing = grouped.get(row.category_key) ?? {
      categoryKey: row.category_key,
      categoryType: row.category_type,
      categoryPath: row.category_path,
      total: 0,
      periods: {},
    };
    const amount = Number.parseFloat(row.amount);
    existing.periods[row.period] = (existing.periods[row.period] ?? 0) + amount;
    existing.total += amount;
    grouped.set(row.category_key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) => b.total - a.total);
}
```

- [ ] **Step 5: Implement query function**

Add `getTransactionAnalysis` to `lib/analytics/transaction-analysis.ts`:

```ts
export async function getTransactionAnalysis(
  filters: AnalysisFilters
): Promise<TransactionAnalysisData> {
  if (filters.hasInvalidDateRange) {
    return emptyTransactionAnalysis();
  }

  const { whereSql, params } = buildAnalysisWhereClause(filters);
  const periodSql = periodExpression(filters.resolvedGrouping);
  const categoryHierarchy = `
    WITH RECURSIVE category_hierarchy AS (
      SELECT id, name, parent_id, category_type, name::varchar as full_path
      FROM categories
      WHERE parent_id IS NULL
      UNION ALL
      SELECT c.id, c.name, c.parent_id, c.category_type, ch.full_path || ' > ' || c.name
      FROM categories c
      INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
    )`;

  const summary = await queryOne<AnalysisSummary>(
    `${categoryHierarchy}
     SELECT
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'income' THEN t.amount
         WHEN t.category_id IS NULL AND t.amount > 0 THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as income,
       COALESCE(ABS(SUM(CASE
         WHEN ch.category_type = 'expense' THEN t.amount
         WHEN t.category_id IS NULL AND t.amount < 0 THEN t.amount
         ELSE 0
       END)), 0)::decimal(15,2) as expenses
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereSql}`,
    params
  );

  const incomeExpenseTrend = await queryMany<IncomeExpenseTrendPoint>(
    `${categoryHierarchy}
     SELECT
       ${periodSql} as period,
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'income' THEN t.amount
         WHEN t.category_id IS NULL AND t.amount > 0 THEN t.amount
         ELSE 0
       END), 0)::decimal(15,2) as income,
       COALESCE(ABS(SUM(CASE
         WHEN ch.category_type = 'expense' THEN t.amount
         WHEN t.category_id IS NULL AND t.amount < 0 THEN t.amount
         ELSE 0
       END)), 0)::decimal(15,2) as expenses
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereSql}
     GROUP BY period
     ORDER BY period ASC`,
    params
  );

  const breakdownSql = (categoryType: 'income' | 'expense') => `${categoryHierarchy}
     SELECT
       t.category_id,
       COALESCE(ch.name, 'Uncategorized') as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path,
       ABS(SUM(t.amount))::decimal(15,2) as amount
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereSql}
       AND (ch.category_type = '${categoryType}' OR (t.category_id IS NULL AND ${categoryType === 'income' ? 't.amount > 0' : 't.amount < 0'}))
     GROUP BY t.category_id, ch.name, ch.full_path
     HAVING ABS(SUM(t.amount)) > 0
     ORDER BY amount DESC`;

  const [rawExpenseBreakdown, rawIncomeBreakdown, rawExpenseStacked, rawIncomeStacked, rawTrendRows] =
    await Promise.all([
      queryMany<Omit<AnalysisCategoryBreakdown, 'percentage'>>(breakdownSql('expense'), params),
      queryMany<Omit<AnalysisCategoryBreakdown, 'percentage'>>(breakdownSql('income'), params),
      queryMany<RawStackedTrendRow>(
        `${categoryHierarchy}
         SELECT ${periodSql} as period,
                COALESCE(t.category_id::text, 'uncategorized-expense') as category_key,
                COALESCE(ch.full_path, 'Uncategorized') as category_path,
                ABS(SUM(t.amount))::decimal(15,2) as amount
         FROM transactions t
         LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
         ${whereSql}
           AND (ch.category_type = 'expense' OR (t.category_id IS NULL AND t.amount < 0))
         GROUP BY period, category_key, category_path
         HAVING ABS(SUM(t.amount)) > 0
         ORDER BY period ASC`,
        params
      ),
      queryMany<RawStackedTrendRow>(
        `${categoryHierarchy}
         SELECT ${periodSql} as period,
                COALESCE(t.category_id::text, 'uncategorized-income') as category_key,
                COALESCE(ch.full_path, 'Uncategorized') as category_path,
                ABS(SUM(t.amount))::decimal(15,2) as amount
         FROM transactions t
         LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
         ${whereSql}
           AND (ch.category_type = 'income' OR (t.category_id IS NULL AND t.amount > 0))
         GROUP BY period, category_key, category_path
         HAVING ABS(SUM(t.amount)) > 0
         ORDER BY period ASC`,
        params
      ),
      queryMany<RawCategoryTrendRow>(
        `${categoryHierarchy}
         SELECT COALESCE(t.category_id::text, CASE WHEN t.amount > 0 THEN 'uncategorized-income' ELSE 'uncategorized-expense' END) as category_key,
                COALESCE(ch.category_type, CASE WHEN t.amount > 0 THEN 'income' ELSE 'expense' END) as category_type,
                COALESCE(ch.full_path, 'Uncategorized') as category_path,
                ${periodSql} as period,
                ABS(SUM(t.amount))::decimal(15,2) as amount
         FROM transactions t
         LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
         ${whereSql}
         GROUP BY category_key, category_type, category_path, period
         HAVING ABS(SUM(t.amount)) > 0
         ORDER BY category_path ASC, period ASC`,
        params
      ),
    ]);

  return {
    summary: summary ?? { income: '0.00', expenses: '0.00' },
    incomeExpenseTrend,
    expenseBreakdown: addPercentages(rawExpenseBreakdown),
    incomeBreakdown: addPercentages(rawIncomeBreakdown),
    expenseStackedTrend: groupStackedTrendRows(rawExpenseStacked),
    incomeStackedTrend: groupStackedTrendRows(rawIncomeStacked),
    categoryTrendRows: groupCategoryTrendRows(rawTrendRows),
  };
}
```

- [ ] **Step 6: Run analytics tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/lib/analytics/transaction-analysis.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit analytics work**

```bash
git add lib/analytics/transaction-analysis.ts __tests__/lib/analytics/transaction-analysis.test.ts
git commit -m "feat: add transaction analysis analytics"
```

## Task 3: Analysis Display Components

**Files:**

- Create: `components/analysis/analysis-summary-cards.tsx`
- Create: `components/analysis/income-expense-trend-chart.tsx`
- Create: `components/analysis/category-breakdown-chart.tsx`
- Create: `components/analysis/category-stacked-trend-chart.tsx`
- Create: `components/analysis/category-trend-table.tsx`

- [ ] **Step 1: Create summary card component**

Create `components/analysis/analysis-summary-cards.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalysisSummaryCardsProps {
  income: string;
  expenses: string;
  locale: string;
  labels: {
    income: string;
    expenses: string;
  };
}

function formatCurrency(amount: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(Number.parseFloat(amount));
}

export function AnalysisSummaryCards({
  income,
  expenses,
  locale,
  labels,
}: AnalysisSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.income}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(income, locale)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.expenses}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(expenses, locale)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Create grouped trend chart**

Create `components/analysis/income-expense-trend-chart.tsx`:

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeExpenseTrendPoint } from '@/lib/analytics/transaction-analysis';

interface IncomeExpenseTrendChartProps {
  data: IncomeExpenseTrendPoint[];
  title: string;
  emptyText: string;
}

export function IncomeExpenseTrendChart({
  data,
  title,
  emptyText,
}: IncomeExpenseTrendChartProps) {
  const chartData = data.map((point) => ({
    period: point.period,
    Income: Number.parseFloat(point.income),
    Expenses: Number.parseFloat(point.expenses),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" />
              <Bar dataKey="Expenses" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create breakdown chart**

Create `components/analysis/category-breakdown-chart.tsx`:

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalysisCategoryBreakdown } from '@/lib/analytics/transaction-analysis';

interface CategoryBreakdownChartProps {
  data: AnalysisCategoryBreakdown[];
  title: string;
  emptyText: string;
  color: string;
}

export function CategoryBreakdownChart({
  data,
  title,
  emptyText,
  color,
}: CategoryBreakdownChartProps) {
  const chartData = data.map((row) => ({
    category: row.category_path,
    amount: Number.parseFloat(row.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="amount" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Create stacked trend chart**

Create `components/analysis/category-stacked-trend-chart.tsx`:

```tsx
'use client';

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StackedTrendPoint } from '@/lib/analytics/transaction-analysis';

interface CategoryStackedTrendChartProps {
  data: StackedTrendPoint[];
  title: string;
  emptyText: string;
}

const COLORS = ['#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#4f46e5', '#65a30d', '#be123c', '#0f766e', '#6b7280'];

function stackKeys(data: StackedTrendPoint[]) {
  return Array.from(
    new Set(
      data.flatMap((point) => Object.keys(point).filter((key) => key !== 'period'))
    )
  );
}

export function CategoryStackedTrendChart({
  data,
  title,
  emptyText,
}: CategoryStackedTrendChartProps) {
  const keys = stackKeys(data);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 || keys.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              {keys.map((key, index) => (
                <Bar key={key} dataKey={key} stackId="category" fill={COLORS[index % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Create category trend table**

Create `components/analysis/category-trend-table.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryTrendRow } from '@/lib/analytics/transaction-analysis';

interface CategoryTrendTableProps {
  rows: CategoryTrendRow[];
  periods: string[];
  title: string;
  emptyText: string;
  totalLabel: string;
  categoryLabel: string;
  typeLabel: string;
  locale: string;
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(amount);
}

export function CategoryTrendTable({
  rows,
  periods,
  title,
  emptyText,
  totalLabel,
  categoryLabel,
  typeLabel,
  locale,
}: CategoryTrendTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{categoryLabel}</TableHead>
                <TableHead>{typeLabel}</TableHead>
                <TableHead className="text-right">{totalLabel}</TableHead>
                {periods.map((period) => (
                  <TableHead key={period} className="text-right">
                    {period}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.categoryKey}>
                  <TableCell className="font-medium">{row.categoryPath}</TableCell>
                  <TableCell className="capitalize">{row.categoryType}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.total, locale)}</TableCell>
                  {periods.map((period) => (
                    <TableCell key={period} className="text-right">
                      {formatCurrency(row.periods[period] ?? 0, locale)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Run TypeScript-adjacent validation through lint**

Run:

```bash
npm run lint
```

Expected: PASS for the new components. Resolve lint diagnostics only in files from this task, then rerun `npm run lint` until it passes.

- [ ] **Step 7: Commit display components**

```bash
git add components/analysis
git commit -m "feat: add analysis display components"
```

## Task 4: Category Filter Tree And Client Filter UI

**Files:**

- Create: `components/analysis/analysis-category-filter.tsx`
- Create: `__tests__/components/analysis/analysis-category-filter.test.tsx`
- Create: `app/(dashboard)/analysis/client.tsx`
- Create: `__tests__/app/analysis-client.test.tsx`

- [ ] **Step 1: Write category filter tests**

Create `__tests__/components/analysis/analysis-category-filter.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnalysisCategoryFilter } from '@/components/analysis/analysis-category-filter';
import { CategoryWithPath } from '@/lib/db/categories';

const categories: CategoryWithPath[] = [
  { id: 1, name: 'Housing', parent_id: null, category_type: 'expense', depth: 1, created_at: new Date('2026-01-01'), path: 'Housing' },
  { id: 2, name: 'Rent', parent_id: 1, category_type: 'expense', depth: 2, created_at: new Date('2026-01-01'), path: 'Housing > Rent' },
  { id: 3, name: 'Utilities', parent_id: 1, category_type: 'expense', depth: 2, created_at: new Date('2026-01-01'), path: 'Housing > Utilities' },
  { id: 4, name: 'Salary', parent_id: null, category_type: 'income', depth: 1, created_at: new Date('2026-01-01'), path: 'Salary' },
];

describe('AnalysisCategoryFilter', () => {
  it('toggles descendants when a parent category changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={[1, 2, 3, 4]}
        includeUncategorizedIncome
        includeUncategorizedExpense
        labels={{
          title: 'Categories',
          income: 'Income',
          expense: 'Expenses',
          uncategorizedIncome: 'Uncategorized income',
          uncategorizedExpense: 'Uncategorized expenses',
        }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Housing' }));

    expect(onChange).toHaveBeenCalledWith({
      selectedCategoryIds: [4],
      includeUncategorizedIncome: true,
      includeUncategorizedExpense: true,
    });
  });

  it('allows child overrides after parent state changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={[4]}
        includeUncategorizedIncome
        includeUncategorizedExpense
        labels={{
          title: 'Categories',
          income: 'Income',
          expense: 'Expenses',
          uncategorizedIncome: 'Uncategorized income',
          uncategorizedExpense: 'Uncategorized expenses',
        }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Rent' }));

    expect(onChange).toHaveBeenCalledWith({
      selectedCategoryIds: [2, 4],
      includeUncategorizedIncome: true,
      includeUncategorizedExpense: true,
    });
  });

  it('toggles uncategorized flags independently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={[1, 2, 3, 4]}
        includeUncategorizedIncome
        includeUncategorizedExpense
        labels={{
          title: 'Categories',
          income: 'Income',
          expense: 'Expenses',
          uncategorizedIncome: 'Uncategorized income',
          uncategorizedExpense: 'Uncategorized expenses',
        }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('checkbox', { name: 'Uncategorized income' }));

    expect(onChange).toHaveBeenCalledWith({
      selectedCategoryIds: [1, 2, 3, 4],
      includeUncategorizedIncome: false,
      includeUncategorizedExpense: true,
    });
  });
});
```

- [ ] **Step 2: Run category filter tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/components/analysis/analysis-category-filter.test.tsx
```

Expected: FAIL because `AnalysisCategoryFilter` does not exist.

- [ ] **Step 3: Implement category filter component**

Create `components/analysis/analysis-category-filter.tsx`:

```tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryWithPath } from '@/lib/db/categories';

interface Labels {
  title: string;
  income: string;
  expense: string;
  uncategorizedIncome: string;
  uncategorizedExpense: string;
}

interface AnalysisCategoryFilterProps {
  categories: CategoryWithPath[];
  selectedCategoryIds: number[];
  includeUncategorizedIncome: boolean;
  includeUncategorizedExpense: boolean;
  labels: Labels;
  onChange: (next: {
    selectedCategoryIds: number[];
    includeUncategorizedIncome: boolean;
    includeUncategorizedExpense: boolean;
  }) => void;
}

function descendantIds(category: CategoryWithPath, categories: CategoryWithPath[]) {
  const ids = [category.id];
  const children = categories.filter((candidate) => candidate.parent_id === category.id);
  for (const child of children) {
    ids.push(...descendantIds(child, categories));
  }
  return ids;
}

function branchState(category: CategoryWithPath, categories: CategoryWithPath[], selected: Set<number>) {
  const ids = descendantIds(category, categories);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  if (selectedCount === 0) return false;
  if (selectedCount === ids.length) return true;
  return 'mixed' as const;
}

function CategoryRow({
  category,
  categories,
  selected,
  onToggle,
}: {
  category: CategoryWithPath;
  categories: CategoryWithPath[];
  selected: Set<number>;
  onToggle: (category: CategoryWithPath) => void;
}) {
  const state = branchState(category, categories, selected);

  return (
    <div style={{ paddingLeft: `${(category.depth - 1) * 16}px` }}>
      <label className="flex items-center gap-2 py-1 text-sm">
        <input
          type="checkbox"
          checked={state === true}
          ref={(input) => {
            if (input) input.indeterminate = state === 'mixed';
          }}
          onChange={() => onToggle(category)}
        />
        <span>{category.name}</span>
      </label>
    </div>
  );
}

export function AnalysisCategoryFilter({
  categories,
  selectedCategoryIds,
  includeUncategorizedIncome,
  includeUncategorizedExpense,
  labels,
  onChange,
}: AnalysisCategoryFilterProps) {
  const selected = new Set(selectedCategoryIds);

  const toggleCategory = (category: CategoryWithPath) => {
    const ids = descendantIds(category, categories);
    const allSelected = ids.every((id) => selected.has(id));
    const next = new Set(selected);
    for (const id of ids) {
      if (allSelected) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    onChange({
      selectedCategoryIds: Array.from(next).sort((a, b) => a - b),
      includeUncategorizedIncome,
      includeUncategorizedExpense,
    });
  };

  const renderGroup = (type: 'income' | 'expense', title: string) => (
    <div className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      {categories
        .filter((category) => category.category_type === type)
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            categories={categories}
            selected={selected}
            onToggle={toggleCategory}
          />
        ))}
      <label className="flex items-center gap-2 py-1 text-sm">
        <input
          type="checkbox"
          checked={type === 'income' ? includeUncategorizedIncome : includeUncategorizedExpense}
          onChange={() =>
            onChange({
              selectedCategoryIds,
              includeUncategorizedIncome:
                type === 'income' ? !includeUncategorizedIncome : includeUncategorizedIncome,
              includeUncategorizedExpense:
                type === 'expense' ? !includeUncategorizedExpense : includeUncategorizedExpense,
            })
          }
        />
        <span>{type === 'income' ? labels.uncategorizedIncome : labels.uncategorizedExpense}</span>
      </label>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        {renderGroup('expense', labels.expense)}
        {renderGroup('income', labels.income)}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run category filter tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/components/analysis/analysis-category-filter.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write client tests**

Create `__tests__/app/analysis-client.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisClient } from '@/app/(dashboard)/analysis/client';
import enMessages from '@/messages/en.json';
import { Account } from '@/lib/db/types';
import { CategoryWithPath } from '@/lib/db/categories';
import { AnalysisFilters } from '@/lib/analysis/filters';
import { TransactionAnalysisData } from '@/lib/analytics/transaction-analysis';

vi.mock('@/components/analysis/income-expense-trend-chart', () => ({
  IncomeExpenseTrendChart: () => <div data-testid="income-expense-chart" />,
}));
vi.mock('@/components/analysis/category-breakdown-chart', () => ({
  CategoryBreakdownChart: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/components/analysis/category-stacked-trend-chart', () => ({
  CategoryStackedTrendChart: ({ title }: { title: string }) => <div>{title}</div>,
}));
vi.mock('@/components/analysis/category-trend-table', () => ({
  CategoryTrendTable: () => <div data-testid="trend-table" />,
}));

describe('AnalysisClient', () => {
  let push: ReturnType<typeof vi.fn>;
  const accounts: Account[] = [
    { id: 1, name: 'Checking', created_at: new Date('2026-01-01') },
    { id: 2, name: 'Savings', created_at: new Date('2026-01-01') },
  ];
  const categories: CategoryWithPath[] = [
    { id: 4, name: 'Salary', parent_id: null, category_type: 'income', depth: 1, created_at: new Date('2026-01-01'), path: 'Salary' },
    { id: 7, name: 'Rent', parent_id: null, category_type: 'expense', depth: 1, created_at: new Date('2026-01-01'), path: 'Rent' },
  ];
  const filters: AnalysisFilters = {
    preset: 'last-3-months',
    from: '2026-02-10',
    to: '2026-05-10',
    grouping: 'adaptive',
    resolvedGrouping: 'weekly',
    includedCategoryIds: [4, 7],
    hasCategoryFilter: false,
    includeUncategorizedIncome: true,
    includeUncategorizedExpense: true,
    hasInvalidDateRange: false,
  };
  const data: TransactionAnalysisData = {
    summary: { income: '1000.00', expenses: '450.00' },
    incomeExpenseTrend: [],
    expenseBreakdown: [],
    incomeBreakdown: [],
    expenseStackedTrend: [],
    incomeStackedTrend: [],
    categoryTrendRows: [],
  };

  beforeEach(() => {
    Element.prototype.hasPointerCapture ??= vi.fn(() => false);
    Element.prototype.setPointerCapture ??= vi.fn();
    Element.prototype.releasePointerCapture ??= vi.fn();
    Element.prototype.scrollIntoView ??= vi.fn();
    push = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('lang=en') as ReturnType<typeof useSearchParams>
    );
  });

  function renderClient() {
    return render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AnalysisClient accounts={accounts} categories={categories} filters={filters} data={data} lang="en" />
      </NextIntlClientProvider>
    );
  }

  it('renders analysis sections', () => {
    renderClient();

    expect(screen.getByRole('heading', { name: 'Analysis' })).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expenses')).toBeInTheDocument();
    expect(screen.getByTestId('income-expense-chart')).toBeInTheDocument();
    expect(screen.getByTestId('trend-table')).toBeInTheDocument();
  });

  it('updates the URL when account changes', async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole('combobox', { name: 'Account' }));
    await user.click(await screen.findByRole('option', { name: 'Savings' }));

    const pushedUrl = push.mock.calls.at(-1)?.[0] as string;
    expect(pushedUrl).toContain('accountId=2');
    expect(pushedUrl).toContain('lang=en');
  });

  it('clears filters back to defaults', async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    const pushedUrl = push.mock.calls.at(-1)?.[0] as string;
    expect(pushedUrl).toBe('/analysis?lang=en');
  });
});
```

- [ ] **Step 6: Implement client component**

Create `app/(dashboard)/analysis/client.tsx` with URL-driven controls and layout:

```tsx
'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalysisCategoryFilter } from '@/components/analysis/analysis-category-filter';
import { AnalysisSummaryCards } from '@/components/analysis/analysis-summary-cards';
import { CategoryBreakdownChart } from '@/components/analysis/category-breakdown-chart';
import { CategoryStackedTrendChart } from '@/components/analysis/category-stacked-trend-chart';
import { CategoryTrendTable } from '@/components/analysis/category-trend-table';
import { IncomeExpenseTrendChart } from '@/components/analysis/income-expense-trend-chart';
import { Account } from '@/lib/db/types';
import { CategoryWithPath } from '@/lib/db/categories';
import { AnalysisDatePreset, AnalysisFilters, AnalysisGrouping } from '@/lib/analysis/filters';
import { TransactionAnalysisData } from '@/lib/analytics/transaction-analysis';

interface AnalysisClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  filters: AnalysisFilters;
  data: TransactionAnalysisData;
  lang: string;
}

function setOrDelete(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) params.set(key, value);
  else params.delete(key);
}

export function AnalysisClient({ accounts, categories, filters, data, lang }: AnalysisClientProps) {
  const t = useTranslations('analysis');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const periods = useMemo(
    () => Array.from(new Set(data.incomeExpenseTrend.map((point) => point.period))),
    [data.incomeExpenseTrend]
  );

  const pushParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get('lang')) params.set('lang', lang);
    for (const [key, value] of Object.entries(updates)) {
      setOrDelete(params, key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedCategoryIds = filters.hasCategoryFilter
    ? filters.includedCategoryIds
    : categories.map((category) => category.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label>{t('dateRange')}</Label>
            <Select value={filters.preset} onValueChange={(value) => pushParams({ preset: value as AnalysisDatePreset })}>
              <SelectTrigger aria-label={t('dateRange')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">{t('presets.thisMonth')}</SelectItem>
                <SelectItem value="last-month">{t('presets.lastMonth')}</SelectItem>
                <SelectItem value="last-3-months">{t('presets.last3Months')}</SelectItem>
                <SelectItem value="last-90-days">{t('presets.last90Days')}</SelectItem>
                <SelectItem value="this-year">{t('presets.thisYear')}</SelectItem>
                <SelectItem value="ytd">{t('presets.ytd')}</SelectItem>
                <SelectItem value="last-year">{t('presets.lastYear')}</SelectItem>
                <SelectItem value="custom">{t('presets.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-from">{t('from')}</Label>
            <Input id="analysis-from" type="date" value={filters.from} onChange={(event) => pushParams({ preset: 'custom', from: event.currentTarget.value })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-to">{t('to')}</Label>
            <Input id="analysis-to" type="date" value={filters.to} onChange={(event) => pushParams({ preset: 'custom', to: event.currentTarget.value })} />
          </div>

          <div className="space-y-2">
            <Label>{t('account')}</Label>
            <Select value={filters.accountId?.toString() ?? 'all'} onValueChange={(value) => pushParams({ accountId: value === 'all' ? undefined : value })}>
              <SelectTrigger aria-label={t('account')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAccounts')}</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('grouping')}</Label>
            <Select value={filters.grouping} onValueChange={(value) => pushParams({ grouping: value as AnalysisGrouping })}>
              <SelectTrigger aria-label={t('grouping')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adaptive">{t('groupings.adaptive')}</SelectItem>
                <SelectItem value="daily">{t('groupings.daily')}</SelectItem>
                <SelectItem value="weekly">{t('groupings.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('groupings.monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => router.push(`/analysis?lang=${lang}`)}>
              {t('reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {filters.hasInvalidDateRange ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {t('invalidDateRange')}
          </CardContent>
        </Card>
      ) : null}

      <AnalysisCategoryFilter
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        includeUncategorizedIncome={filters.includeUncategorizedIncome}
        includeUncategorizedExpense={filters.includeUncategorizedExpense}
        labels={{
          title: t('categories'),
          income: t('income'),
          expense: t('expenses'),
          uncategorizedIncome: t('uncategorizedIncome'),
          uncategorizedExpense: t('uncategorizedExpense'),
        }}
        onChange={(next) =>
          pushParams({
            categories: next.selectedCategoryIds.join(','),
            uncategorizedIncome: next.includeUncategorizedIncome ? undefined : '0',
            uncategorizedExpense: next.includeUncategorizedExpense ? undefined : '0',
          })
        }
      />

      <AnalysisSummaryCards
        income={data.summary.income}
        expenses={data.summary.expenses}
        locale={lang}
        labels={{ income: t('income'), expenses: t('expenses') }}
      />

      <IncomeExpenseTrendChart data={data.incomeExpenseTrend} title={t('incomeVsExpensesTrend')} emptyText={t('empty')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryStackedTrendChart data={data.expenseStackedTrend} title={t('expenseStackedTrend')} emptyText={t('emptyExpenses')} />
        <CategoryStackedTrendChart data={data.incomeStackedTrend} title={t('incomeStackedTrend')} emptyText={t('emptyIncome')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBreakdownChart data={data.expenseBreakdown} title={t('expenseBreakdown')} emptyText={t('emptyExpenses')} color="#ef4444" />
        <CategoryBreakdownChart data={data.incomeBreakdown} title={t('incomeBreakdown')} emptyText={t('emptyIncome')} color="#22c55e" />
      </div>

      <CategoryTrendTable
        rows={data.categoryTrendRows}
        periods={periods}
        title={t('categoryTrendTable')}
        emptyText={t('empty')}
        totalLabel={t('total')}
        categoryLabel={t('category')}
        typeLabel={t('type')}
        locale={lang}
      />
    </div>
  );
}
```

- [ ] **Step 7: Run client tests and fix compile issues**

Run:

```bash
npm test -- --run __tests__/components/analysis/analysis-category-filter.test.tsx __tests__/app/analysis-client.test.tsx
```

Expected: PASS. Resolve import and type diagnostics only in files from this task, then rerun the same command until it passes.

- [ ] **Step 8: Commit category and client UI**

```bash
git add components/analysis/analysis-category-filter.tsx __tests__/components/analysis/analysis-category-filter.test.tsx 'app/(dashboard)/analysis/client.tsx' __tests__/app/analysis-client.test.tsx
git commit -m "feat: add analysis filter interface"
```

## Task 5: Server Route, Navigation, And Translations

**Files:**

- Create: `app/(dashboard)/analysis/page.tsx`
- Modify: `components/dashboard/nav.tsx`
- Modify: `messages/en.json`
- Modify: `messages/pt-BR.json`

- [ ] **Step 1: Implement server page**

Create `app/(dashboard)/analysis/page.tsx`:

```tsx
import { AnalysisClient } from './client';
import { getTransactionAnalysis } from '@/lib/analytics/transaction-analysis';
import { parseAnalysisFilters } from '@/lib/analysis/filters';
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { getLangFromUrl } from '@/lib/i18n/utils';

interface AnalysisPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const params = await searchParams;
  const lang = await getLangFromUrl();
  const accounts = await getAllAccounts();
  const categories = await getAllCategoriesWithPaths();
  const parsed = parseAnalysisFilters(params);
  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const filters = {
    ...parsed,
    accountId: parsed.accountId && validAccountIds.has(parsed.accountId) ? parsed.accountId : undefined,
    includedCategoryIds: parsed.includedCategoryIds.filter((id) => validCategoryIds.has(id)),
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
```

- [ ] **Step 2: Add navigation link**

Modify `components/dashboard/nav.tsx` so `navLinks` includes Analysis after Transactions:

```tsx
  const navLinks = [
    { href: `/?lang=${lang}`, label: t('dashboard') },
    { href: `/accounts?lang=${lang}`, label: t('accounts') },
    { href: `/transactions?lang=${lang}`, label: t('transactions') },
    { href: `/analysis?lang=${lang}`, label: t('analysis') },
  ];
```

- [ ] **Step 3: Add English translations**

Modify `messages/en.json`:

```json
{
  "nav": {
    "analysis": "Analysis"
  },
  "analysis": {
    "title": "Analysis",
    "description": "Analyze income and expense trends across accounts and categories.",
    "filters": "Filters",
    "dateRange": "Date range",
    "from": "From",
    "to": "To",
    "account": "Account",
    "allAccounts": "All accounts",
    "grouping": "Grouping",
    "reset": "Reset",
    "categories": "Categories",
    "income": "Income",
    "expenses": "Expenses",
    "category": "Category",
    "type": "Type",
    "total": "Total",
    "uncategorizedIncome": "Uncategorized income",
    "uncategorizedExpense": "Uncategorized expenses",
    "incomeVsExpensesTrend": "Income vs Expenses",
    "expenseBreakdown": "Expense Breakdown",
    "incomeBreakdown": "Income Breakdown",
    "expenseStackedTrend": "Expense Categories Over Time",
    "incomeStackedTrend": "Income Categories Over Time",
    "categoryTrendTable": "Category Trend Table",
    "empty": "No matching transactions for this selection.",
    "emptyIncome": "No included income transactions for this selection.",
    "emptyExpenses": "No included expense transactions for this selection.",
    "invalidDateRange": "The selected start date is after the end date.",
    "presets": {
      "thisMonth": "This month",
      "lastMonth": "Last month",
      "last3Months": "Last 3 months",
      "last90Days": "Last 90 days",
      "thisYear": "This year",
      "ytd": "YTD",
      "lastYear": "Last year",
      "custom": "Custom"
    },
    "groupings": {
      "adaptive": "Adaptive",
      "daily": "Daily",
      "weekly": "Weekly",
      "monthly": "Monthly"
    }
  }
}
```

Insert the keys into the existing JSON objects instead of replacing the whole file.

- [ ] **Step 4: Add Portuguese translations**

Modify `messages/pt-BR.json`:

```json
{
  "nav": {
    "analysis": "Análise"
  },
  "analysis": {
    "title": "Análise",
    "description": "Analise tendências de receitas e despesas entre contas e categorias.",
    "filters": "Filtros",
    "dateRange": "Período",
    "from": "De",
    "to": "Até",
    "account": "Conta",
    "allAccounts": "Todas as contas",
    "grouping": "Agrupamento",
    "reset": "Redefinir",
    "categories": "Categorias",
    "income": "Receitas",
    "expenses": "Despesas",
    "category": "Categoria",
    "type": "Tipo",
    "total": "Total",
    "uncategorizedIncome": "Receitas sem categoria",
    "uncategorizedExpense": "Despesas sem categoria",
    "incomeVsExpensesTrend": "Receitas vs Despesas",
    "expenseBreakdown": "Detalhamento de Despesas",
    "incomeBreakdown": "Detalhamento de Receitas",
    "expenseStackedTrend": "Categorias de Despesas ao Longo do Tempo",
    "incomeStackedTrend": "Categorias de Receitas ao Longo do Tempo",
    "categoryTrendTable": "Tabela de Tendências por Categoria",
    "empty": "Nenhuma transação corresponde a esta seleção.",
    "emptyIncome": "Nenhuma receita incluída corresponde a esta seleção.",
    "emptyExpenses": "Nenhuma despesa incluída corresponde a esta seleção.",
    "invalidDateRange": "A data inicial selecionada é posterior à data final.",
    "presets": {
      "thisMonth": "Este mês",
      "lastMonth": "Mês passado",
      "last3Months": "Últimos 3 meses",
      "last90Days": "Últimos 90 dias",
      "thisYear": "Este ano",
      "ytd": "Ano até hoje",
      "lastYear": "Ano passado",
      "custom": "Personalizado"
    },
    "groupings": {
      "adaptive": "Adaptativo",
      "daily": "Diário",
      "weekly": "Semanal",
      "monthly": "Mensal"
    }
  }
}
```

Insert the keys into the existing JSON objects instead of replacing the whole file.

- [ ] **Step 5: Run focused tests and lint**

Run:

```bash
npm test -- --run __tests__/lib/analysis/filters.test.ts __tests__/lib/analytics/transaction-analysis.test.ts __tests__/components/analysis/analysis-category-filter.test.tsx __tests__/app/analysis-client.test.tsx
npm run lint
```

Expected: both commands PASS.

- [ ] **Step 6: Commit route, nav, and translations**

```bash
git add 'app/(dashboard)/analysis/page.tsx' components/dashboard/nav.tsx messages/en.json messages/pt-BR.json
git commit -m "feat: add analysis route"
```

## Task 6: E2E Coverage And Final Verification

**Files:**

- Create: `e2e/11-analysis.spec.ts`

- [ ] **Step 1: Write E2E tests**

Create `e2e/11-analysis.spec.ts`:

```ts
import { test, expect } from './fixtures';
import { login } from './helpers/auth';

test.describe('Transaction Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('link', { name: /analysis/i }).click();
  });

  test('renders the default analysis view', async ({ page }) => {
    await expect(page).toHaveURL(/\/analysis/);
    await expect(page.getByRole('heading', { name: /analysis/i, level: 2 })).toBeVisible();
    await expect(page.getByText(/income vs expenses/i)).toBeVisible();
    await expect(page.getByText(/expense categories over time/i)).toBeVisible();
    await expect(page.getByText(/income categories over time/i)).toBeVisible();
    await expect(page.getByText(/category trend table/i)).toBeVisible();
  });

  test('updates URL when filters change', async ({ page }) => {
    await page.getByRole('combobox', { name: /grouping/i }).click();
    await page.getByRole('option', { name: /monthly/i }).click();
    await expect(page).toHaveURL(/grouping=monthly/);

    await page.getByRole('combobox', { name: /date range/i }).click();
    await page.getByRole('option', { name: /last year/i }).click();
    await expect(page).toHaveURL(/preset=last-year/);
  });

  test('category toggles keep the page usable', async ({ page }) => {
    await page.getByRole('checkbox', { name: /uncategorized income/i }).click();
    await expect(page.getByText(/income vs expenses/i)).toBeVisible();
    await expect(page.getByText(/category trend table/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E analysis spec**

Run:

```bash
npm run test:e2e -- e2e/11-analysis.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Run complete local verification**

Run:

```bash
npm run lint
npm test -- --run
npm run test:e2e
```

Expected: all commands PASS.

- [ ] **Step 4: Commit E2E coverage**

```bash
git add e2e/11-analysis.spec.ts
git commit -m "test: cover transaction analysis view"
```

## Final Checklist

- [ ] `/analysis` is reachable from navigation.
- [ ] Defaults are Last 3 months, all accounts, all categories, and Adaptive grouping.
- [ ] Date preset, account, grouping, custom dates, and category selections update the URL.
- [ ] Income and expense summary totals render.
- [ ] Income vs expenses grouped bar chart renders.
- [ ] Expense and income horizontal breakdown charts render.
- [ ] Expense and income stacked trend charts render top 10 categories plus `Other`.
- [ ] Category trend table renders totals and period columns.
- [ ] Invalid date ranges render an invalid state.
- [ ] English and Portuguese translations include all new labels.
- [ ] `npm run lint` passes.
- [ ] `npm test -- --run` passes.
- [ ] `npm run test:e2e` passes.
