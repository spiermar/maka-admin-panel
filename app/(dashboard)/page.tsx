import { Suspense } from 'react';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { CashFlowChart } from '@/components/dashboard/cash-flow-chart';
import { CategoryChart } from '@/components/dashboard/category-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import {
  getMonthlyCashFlow,
  getCategoryBreakdown,
} from '@/lib/analytics/cash-flow';

export default async function DashboardPage() {
  const [monthlyData, expenseBreakdown, incomeBreakdown] = await Promise.all([
    getMonthlyCashFlow(6),
    getCategoryBreakdown('expense', 5),
    getCategoryBreakdown('income', 5),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      <Suspense fallback={<div>Loading summary...</div>}>
        <SummaryCards />
      </Suspense>

      <CashFlowChart data={monthlyData} />

      <div className="grid gap-6 md:grid-cols-2">
        <CategoryChart
          data={expenseBreakdown}
          title="Top Expenses This Month"
          color="#ef4444"
        />
        <CategoryChart
          data={incomeBreakdown}
          title="Income Sources This Month"
          color="#22c55e"
        />
      </div>

      <Suspense fallback={<div>Loading transactions...</div>}>
        <RecentTransactions />
      </Suspense>
    </div>
  );
}
