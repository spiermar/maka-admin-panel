import { requireAuth } from '@/lib/auth/session';
import { getExpenseReports } from '@/lib/db/expense-reports';
import ExpenseReportsList from './ExpenseReportsList';

export default async function ExpenseReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAuth();
  const { locale } = await params;
  const reports = await getExpenseReports();
  return <ExpenseReportsList reports={reports} locale={locale} />;
}