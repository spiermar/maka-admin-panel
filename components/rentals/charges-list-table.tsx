'use client';

import { useTranslations } from 'next-intl';
import { RentCharge } from '@/lib/db/types';

const STATUS_BADGE_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
};

interface ChargesListTableProps {
  charges: RentCharge[];
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

export function ChargesListTable({
  charges,
  lang,
}: ChargesListTableProps) {
  const t = useTranslations('rentals');

  // Sort by charge date descending
  const sortedCharges = [...charges].sort(
    (a, b) => new Date(b.charge_date).getTime() - new Date(a.charge_date).getTime()
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">{t('charges.columns.lease')}</th>
            <th className="pb-3 font-medium">{t('charges.columns.chargeDate')}</th>
            <th className="pb-3 font-medium">{t('charges.columns.dueDate')}</th>
            <th className="pb-3 font-medium">{t('charges.columns.amount')}</th>
            <th className="pb-3 font-medium">{t('charges.columns.status')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedCharges.map((charge) => (
            <tr
              key={charge.id}
              className="border-b hover:bg-muted/50"
            >
              <td className="py-3">#{charge.lease_id}</td>
              <td className="py-3">{formatDate(charge.charge_date, lang)}</td>
              <td className="py-3">{formatDate(charge.due_date, lang)}</td>
              <td className="py-3">{formatCurrency(charge.amount, lang)}</td>
              <td className="py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[charge.status]}`}
                >
                  {t(`chargeStatus.${charge.status}`)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}