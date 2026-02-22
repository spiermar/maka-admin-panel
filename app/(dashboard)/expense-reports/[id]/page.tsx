import { requireAuth } from '@/lib/auth/session';
import { getExpenseReportById } from '@/lib/db/expense-reports';
import { getExpensesByReport } from '@/lib/db/expense-reports';
import { getTransactionsForExpenseReport } from '@/lib/db/transactions';
import { notFound } from 'next/navigation';
import ExpenseReportDetail from './ExpenseReportDetail';

export default async function ExpenseReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  const reportId = parseInt(id);
  
  if (isNaN(reportId)) {
    notFound();
  }

  const report = await getExpenseReportById(reportId);
  if (!report) {
    notFound();
  }

  const expenses = await getExpensesByReport(reportId);
  const transactions = await getTransactionsForExpenseReport();
  
  return <ExpenseReportDetail report={report} expenses={expenses} transactions={transactions} />;
}