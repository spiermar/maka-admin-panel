import { requireAuth } from '@/lib/auth/session';
import CreateReportForm from './CreateReportForm';

export default async function NewExpenseReportPage() {
  await requireAuth();
  return <CreateReportForm />;
}