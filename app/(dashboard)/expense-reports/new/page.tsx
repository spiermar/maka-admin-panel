import { requireAuth } from '@/lib/auth/session';
import CreateReportForm from './CreateReportForm';

export default async function NewExpenseReportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await requireAuth();
  const { locale } = await params;
  return <CreateReportForm locale={locale} />;
}