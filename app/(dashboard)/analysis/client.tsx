'use client';

import { useMemo } from 'react';
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

function setOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

export function AnalysisClient({
  accounts,
  categories,
  filters,
  data,
  lang,
}: AnalysisClientProps) {
  const t = useTranslations('analysis');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedCategoryIds = filters.hasCategoryFilter
    ? filters.includedCategoryIds
    : categories.map((category) => category.id);
  const periods = useMemo(
    () => [
      ...new Set(data.incomeExpenseTrend.map((point) => point.period)),
    ],
    [data.incomeExpenseTrend]
  );

  const pushParams = (update: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!params.get('lang')) {
      params.set('lang', lang);
    }

    update(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const updateFilter = (key: string, value: string) => {
    pushParams((params) => setOptionalParam(params, key, value));
  };

  const updateDateFilter = (key: 'from' | 'to', value: string) => {
    pushParams((params) => {
      params.set('preset', 'custom');
      setOptionalParam(params, key, value);
    });
  };

  const resetFilters = () => {
    router.push(`/analysis?lang=${encodeURIComponent(lang)}`);
  };

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
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="analysis-preset">{t('dateRangePreset')}</Label>
              <Select
                value={filters.preset}
                onValueChange={(value) => updateFilter('preset', value)}
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
                value={filters.from}
                onChange={(event) => updateDateFilter('from', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-to">{t('to')}</Label>
              <Input
                id="analysis-to"
                type="date"
                value={filters.to}
                onChange={(event) => updateDateFilter('to', event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysis-account">{t('account')}</Label>
              <Select
                value={filters.accountId?.toString() ?? 'all'}
                onValueChange={(value) =>
                  updateFilter('accountId', value === 'all' ? '' : value)
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
                value={filters.grouping}
                onValueChange={(value) => updateFilter('grouping', value)}
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
            selectedCategoryIds={selectedCategoryIds}
            includeUncategorizedIncome={filters.includeUncategorizedIncome}
            includeUncategorizedExpense={filters.includeUncategorizedExpense}
            labels={{
              title: t('categories.title'),
              income: t('categories.income'),
              expense: t('categories.expense'),
              uncategorizedIncome: t('categories.uncategorizedIncome'),
              uncategorizedExpense: t('categories.uncategorizedExpense'),
            }}
            onChange={(next) => {
              pushParams((params) => {
                params.set('categories', next.selectedCategoryIds.join(','));

                if (next.includeUncategorizedIncome) {
                  params.delete('uncategorizedIncome');
                } else {
                  params.set('uncategorizedIncome', '0');
                }

                if (next.includeUncategorizedExpense) {
                  params.delete('uncategorizedExpense');
                } else {
                  params.set('uncategorizedExpense', '0');
                }
              });
            }}
          />
        </CardContent>
      </Card>

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
