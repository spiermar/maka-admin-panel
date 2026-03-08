'use client';

import { useTranslations } from 'next-intl';
import { PaymentWithLease } from '@/lib/db/rentals-payments';

const METHOD_BADGE_STYLES: Record<string, string> = {
  cash: 'bg-blue-100 text-blue-700',
  check: 'bg-purple-100 text-purple-700',
  bank_transfer: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

interface PaymentsListTableProps {
  payments: PaymentWithLease[];
  lang: string;
}

function formatDate(value: string, lang: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatCurrency(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function PaymentsListTable({
  payments,
  lang,
}: PaymentsListTableProps) {
  const t = useTranslations('rentals');

  // Sort by payment date descending
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
  );

  if (sortedPayments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('payments.noPayments')}</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">{t('payments.columns.lease')}</th>
            <th className="pb-3 font-medium">{t('payments.columns.paymentDate')}</th>
            <th className="pb-3 font-medium">{t('payments.columns.amount')}</th>
            <th className="pb-3 font-medium">{t('payments.columns.method')}</th>
            <th className="pb-3 font-medium">{t('payments.columns.notes')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedPayments.map((payment) => (
            <tr
              key={payment.id}
              className="border-b hover:bg-muted/50"
            >
              <td className="py-3">
                <div className="flex flex-col">
                  <span className="font-medium">{payment.tenant_name}</span>
                  <span className="text-sm text-muted-foreground">
                    {payment.property_name} • Unit {payment.unit_number}
                  </span>
                </div>
              </td>
              <td className="py-3">{formatDate(payment.payment_date, lang)}</td>
              <td className="py-3">{formatCurrency(payment.amount, lang)}</td>
              <td className="py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${METHOD_BADGE_STYLES[payment.payment_method]}`}
                >
                  {t(`paymentMethod.${payment.payment_method}`)}
                </span>
              </td>
              <td className="py-3 max-w-xs truncate" title={payment.notes || ''}>
                {payment.notes || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}