'use client';

import { useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AnalysisCategoryFilter } from '@/components/analysis/analysis-category-filter';
import { AnalysisSummaryCards } from '@/components/analysis/analysis-summary-cards';
import { CategoryBreakdownChart } from '@/components/analysis/category-breakdown-chart';
import { CategoryStackedTrendChart } from '@/components/analysis/category-stacked-trend-chart';
import { CategoryTrendTable } from '@/components/analysis/category-trend-table';
import { IncomeExpenseTrendChart } from '@/components/analysis/income-expense-trend-chart';
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
import type {
  AnalysisDatePreset,
  AnalysisFilters,
  AnalysisGrouping,
} from '@/lib/analysis/filters';
import type { TransactionAnalysisData } from '@/lib/analytics/transaction-analysis';
import type { Account, CategoryWithPath } from '@/lib/db/types';

interface AnalysisClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  filters: AnalysisFilters;
  data: TransactionAnalysisData;
  lang: string;
}

interface AnalysisFilterDraft {
  preset: AnalysisDatePreset;
  from: string;
  to: string;
  accountId: string;
  grouping: AnalysisGrouping;
  categoryIds: number[];
  includeUncategorizedIncome: boolean;
  includeUncategorizedExpense: boolean;
}

const DATE_PRESET_OPTIONS: Array<{
  value: AnalysisDatePreset;
  labelKey: string;
}> = [
  { value: 'this-month', labelKey: 'presets.thisMonth' },
  { value: 'last-month', labelKey: 'presets.lastMonth' },
  { value: 'last-3-months', labelKey: 'presets.last3Months' },
  { value: 'last-90-days', labelKey: 'presets.last90Days' },
  { value: 'this-year', labelKey: 'presets.thisYear' },
  { value: 'ytd', labelKey: 'presets.ytd' },
  { value: 'last-year', labelKey: 'presets.lastYear' },
  { value: 'custom', labelKey: 'presets.custom' },
];

const GROUPING_OPTIONS: Array<{
  value: AnalysisGrouping;
  labelKey: string;
}> = [
  { value: 'adaptive', labelKey: 'groupings.adaptive' },
  { value: 'daily', labelKey: 'groupings.daily' },
  { value: 'weekly', labelKey: 'groupings.weekly' },
  { value: 'monthly', labelKey: 'groupings.monthly' },
];

function sortedCategoryIds(ids: Iterable<number>) {
  return [...ids].sort((a, b) => a - b);
}

function createAnalysisFilterDraft(
  filters: AnalysisFilters,
  categories: CategoryWithPath[]
): AnalysisFilterDraft {
  return {
    preset: filters.preset,
    from: filters.from,
    to: filters.to,
    accountId: filters.accountId?.toString() ?? '',
    grouping: filters.grouping,
    categoryIds: filters.hasCategoryFilter
      ? sortedCategoryIds(filters.includedCategoryIds)
      : sortedCategoryIds(categories.map((category) => category.id)),
    includeUncategorizedIncome: filters.includeUncategorizedIncome,
    includeUncategorizedExpense: filters.includeUncategorizedExpense,
  };
}

function createAnalysisFilterDraftSyncKey(
  filters: AnalysisFilters,
  categories: CategoryWithPath[]
) {
  return [
    filters.preset,
    filters.from,
    filters.to,
    filters.accountId ?? '',
    filters.grouping,
    filters.hasCategoryFilter
      ? sortedCategoryIds(filters.includedCategoryIds).join(',')
      : 'all',
    filters.includeUncategorizedIncome ? '1' : '0',
    filters.includeUncategorizedExpense ? '1' : '0',
    sortedCategoryIds(categories.map((category) => category.id)).join(','),
  ].join('|');
}

export function AnalysisClient({
  accounts,
  categories,
  filters,
  data,
  lang,
}: AnalysisClientProps) {
  const t = useTranslations('analysis');
  const filterControlsKey = createAnalysisFilterDraftSyncKey(filters, categories);
  const periods = useMemo(
    () => [
      ...new Set(data.incomeExpenseTrend.map((point) => point.period)),
    ],
    [data.incomeExpenseTrend]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <AnalysisFilterControls
        key={filterControlsKey}
        accounts={accounts}
        categories={categories}
        filters={filters}
        lang={lang}
      />

      <AnalysisSummaryCards
        income={data.summary.income}
        expenses={data.summary.expenses}
        locale={lang}
        labels={{
          income: t('summary.income'),
          expenses: t('summary.expenses'),
        }}
      />

      <IncomeExpenseTrendChart
        data={data.incomeExpenseTrend}
        title={t('charts.incomeExpenseTrend')}
        emptyText={t('charts.empty')}
        locale={lang}
        labels={{
          income: t('summary.income'),
          expenses: t('summary.expenses'),
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryStackedTrendChart
          data={data.incomeStackedTrend}
          title={t('charts.incomeStackedTrend')}
          emptyText={t('charts.empty')}
          locale={lang}
        />
        <CategoryStackedTrendChart
          data={data.expenseStackedTrend}
          title={t('charts.expenseStackedTrend')}
          emptyText={t('charts.empty')}
          locale={lang}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryBreakdownChart
          data={data.incomeBreakdown}
          title={t('charts.incomeBreakdown')}
          emptyText={t('charts.empty')}
          color="#22c55e"
          locale={lang}
        />
        <CategoryBreakdownChart
          data={data.expenseBreakdown}
          title={t('charts.expenseBreakdown')}
          emptyText={t('charts.empty')}
          color="#ef4444"
          locale={lang}
        />
      </div>

      <CategoryTrendTable
        rows={data.categoryTrends}
        periods={periods}
        title={t('charts.categoryTrendTable')}
        emptyText={t('charts.empty')}
        locale={lang}
        labels={{
          category: t('table.category'),
          type: t('table.type'),
          total: t('table.total'),
          income: t('table.income'),
          expense: t('table.expense'),
        }}
      />
    </div>
  );
}

interface AnalysisFilterControlsProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  filters: AnalysisFilters;
  lang: string;
}

function AnalysisFilterControls({
  accounts,
  categories,
  filters,
  lang,
}: AnalysisFilterControlsProps) {
  const t = useTranslations('analysis');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterDraft, setFilterDraft] = useState(() =>
    createAnalysisFilterDraft(filters, categories)
  );
  const filterDraftRef = useRef(filterDraft);
  const allCategoryIds = useMemo(
    () => sortedCategoryIds(categories.map((category) => category.id)),
    [categories]
  );

  const pushDraft = (draft: AnalysisFilterDraft) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set('lang', lang);

    if (draft.preset === 'last-3-months') {
      params.delete('preset');
    } else {
      params.set('preset', draft.preset);
    }

    if (draft.preset === 'custom') {
      params.set('from', draft.from);
      params.set('to', draft.to);
    } else {
      params.delete('from');
      params.delete('to');
    }

    if (draft.accountId) {
      params.set('accountId', draft.accountId);
    } else {
      params.delete('accountId');
    }

    if (draft.grouping === 'adaptive') {
      params.delete('grouping');
    } else {
      params.set('grouping', draft.grouping);
    }

    const selectedCategoryIds = sortedCategoryIds(draft.categoryIds);
    const allCategoriesSelected =
      selectedCategoryIds.length === allCategoryIds.length &&
      selectedCategoryIds.every((id, index) => id === allCategoryIds[index]);
    const hasDefaultCategoryFilter =
      allCategoriesSelected &&
      draft.includeUncategorizedIncome &&
      draft.includeUncategorizedExpense;

    if (hasDefaultCategoryFilter) {
      params.delete('categories');
      params.delete('uncategorizedIncome');
      params.delete('uncategorizedExpense');
    } else {
      params.set('categories', selectedCategoryIds.join(','));

      if (draft.includeUncategorizedIncome) {
        params.delete('uncategorizedIncome');
      } else {
        params.set('uncategorizedIncome', '0');
      }

      if (draft.includeUncategorizedExpense) {
        params.delete('uncategorizedExpense');
      } else {
        params.set('uncategorizedExpense', '0');
      }
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  const updateDraft = (
    update: (current: AnalysisFilterDraft) => AnalysisFilterDraft
  ) => {
    const nextDraft = update(filterDraftRef.current);
    filterDraftRef.current = nextDraft;
    setFilterDraft(nextDraft);
    pushDraft(nextDraft);
  };

  const updateDateFilter = (key: 'from' | 'to', value: string) => {
    updateDraft((current) => ({
      ...current,
      preset: 'custom',
      [key]: value,
    }));
  };

  const resetFilters = () => {
    router.push(`/analysis?lang=${encodeURIComponent(lang)}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('filters')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label htmlFor="analysis-preset">{t('dateRangePreset')}</Label>
            <Select
              value={filterDraft.preset}
              onValueChange={(value) =>
                updateDraft((current) => ({
                  ...current,
                  preset: value as AnalysisDatePreset,
                }))
              }
            >
              <SelectTrigger
                id="analysis-preset"
                aria-label={t('dateRangePreset')}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-from">{t('from')}</Label>
            <Input
              id="analysis-from"
              type="date"
              value={filterDraft.from}
              onChange={(event) => updateDateFilter('from', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-to">{t('to')}</Label>
            <Input
              id="analysis-to"
              type="date"
              value={filterDraft.to}
              onChange={(event) => updateDateFilter('to', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-account">{t('account')}</Label>
            <Select
              value={filterDraft.accountId || 'all'}
              onValueChange={(value) =>
                updateDraft((current) => ({
                  ...current,
                  accountId: value === 'all' ? '' : value,
                }))
              }
            >
              <SelectTrigger id="analysis-account" aria-label={t('account')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allAccounts')}</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis-grouping">{t('grouping')}</Label>
            <Select
              value={filterDraft.grouping}
              onValueChange={(value) =>
                updateDraft((current) => ({
                  ...current,
                  grouping: value as AnalysisGrouping,
                }))
              }
            >
              <SelectTrigger id="analysis-grouping" aria-label={t('grouping')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPING_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={resetFilters}>
            {t('resetFilters')}
          </Button>
        </div>

        {filters.hasInvalidDateRange ? (
          <div className="text-sm font-medium text-red-600" role="alert">
            {t('invalidDateRange')}
          </div>
        ) : null}

        <AnalysisCategoryFilter
          categories={categories}
          selectedCategoryIds={filterDraft.categoryIds}
          includeUncategorizedIncome={filterDraft.includeUncategorizedIncome}
          includeUncategorizedExpense={filterDraft.includeUncategorizedExpense}
          labels={{
            title: t('categories.title'),
            income: t('categories.income'),
            expense: t('categories.expense'),
            uncategorizedIncome: t('categories.uncategorizedIncome'),
            uncategorizedExpense: t('categories.uncategorizedExpense'),
          }}
          onChange={(next) => {
            updateDraft((current) => ({
              ...current,
              categoryIds: sortedCategoryIds(next.selectedCategoryIds),
              includeUncategorizedIncome: next.includeUncategorizedIncome,
              includeUncategorizedExpense: next.includeUncategorizedExpense,
            }));
          }}
        />
      </CardContent>
    </Card>
  );
}
