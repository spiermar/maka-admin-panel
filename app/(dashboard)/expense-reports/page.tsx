import { requireAuth } from '@/lib/auth/session';
import { getExpenseReports } from '@/lib/db/expense-reports';
import ExpenseReportsList from './ExpenseReportsList';

export default async function ExpenseReportsPage() {
  await requireAuth();
  const reports = await getExpenseReports();
  return <ExpenseReportsList reports={reports} />;
}