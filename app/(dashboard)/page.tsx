import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import {
  getDailyCashFlow,
  getCategoryBreakdown,
} from '@/lib/analytics/cash-flow';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const [dailyData, expenseBreakdown, incomeBreakdown] = await Promise.all([
    getDailyCashFlow(30),
    getCategoryBreakdown('expense', 5),
    getCategoryBreakdown('income', 5),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t('title')}</h2>

      <Suspense fallback={<div>{t('loading')}</div>}>
        <SummaryCards />
      </Suspense>

      <CashFlowChart data={dailyData} />

      <div className="grid gap-6 md:grid-cols-2">
        <CategoryChart
          data={expenseBreakdown}
          title={t('topExpenses')}
          color="#ef4444"
        />
        <CategoryChart
          data={incomeBreakdown}
          title={t('incomeSources')}
          color="#22c55e"
        />
      </div>

      <Suspense fallback={<div>{t('loading')}</div>}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}
