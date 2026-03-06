'use client';

import { useTranslations } from 'next-intl';
import { ExpenseReportWithDetails } from '@/lib/db/types';
import Link from 'next/link';

interface Props {
  reports: ExpenseReportWithDetails[];
  locale: string;
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function formatDate(date: Date, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpenseReportsList({ reports, locale }: Props) {
  const t = useTranslations('expenseReports');
  const tCommon = useTranslations('common');

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: locale === 'pt-BR' ? 'BRL' : 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Link
          href={`/expense-reports/new?lang=${locale}`}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {t('newReport')}
        </Link>
      </div>

      <div className="border rounded-md">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3">{t('titleLabel')}</th>
              <th className="text-left p-3">{t('user')}</th>
              <th className="text-left p-3">{tCommon('amount')}</th>
              <th className="text-left p-3">{t('status')}</th>
              <th className="text-left p-3">{t('created')}</th>
              <th className="text-left p-3">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {t('noExpenseReports')}
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}?lang=${locale}`} className="hover:underline">
                      {report.title}
                    </Link>
                  </td>
                  <td className="p-3">{report.username}</td>
                  <td className="p-3">{formatCurrency(report.total_amount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="p-3">{formatDate(new Date(report.created_at), locale)}</td>
                  <td className="p-3">
                    <Link href={`/expense-reports/${report.id}?lang=${locale}`} className="text-primary hover:underline">
                      {t('view')}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}