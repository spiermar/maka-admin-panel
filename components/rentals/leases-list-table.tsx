'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lease, LeaseStatus } from '@/lib/db/types';
import { Tenant } from '@/lib/db/types';
import { UnitInventoryRow } from '@/lib/db/rentals-units';

const STATUS_BADGE_STYLES: Record<LeaseStatus, string> = {
  Draft: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Expired: 'bg-gray-100 text-gray-700',
  Terminated: 'bg-red-100 text-red-700',
};

interface LeasesListTableProps {
  leases: Lease[];
  tenants: Map<number, Tenant>;
  units: Map<number, UnitInventoryRow>;
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

export function LeaseListTable({
  leases,
  tenants,
  units,
  lang,
}: LeasesListTableProps) {
  const t = useTranslations('rentals');

  // Sort: Active first, then by end_date ASC (soonest expiring)
  const sortedLeases = [...leases].sort((a, b) => {
    const statusOrder: Record<LeaseStatus, number> = {
      Active: 0,
      Pending: 1,
      Draft: 2,
      Expired: 3,
      Terminated: 4,
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="pb-3 font-medium">{t('leases.columns.unit')}</th>
            <th className="pb-3 font-medium">{t('leases.columns.tenant')}</th>
            <th className="pb-3 font-medium">{t('leases.columns.status')}</th>
            <th className="pb-3 font-medium">{t('leases.columns.startDate')}</th>
            <th className="pb-3 font-medium">{t('leases.columns.endDate')}</th>
            <th className="pb-3 font-medium">{t('leases.columns.rent')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedLeases.map((lease) => {
            const tenant = tenants.get(lease.tenant_id);
            const unit = units.get(lease.unit_id);
            return (
              <tr
                key={lease.id}
                className="border-b hover:bg-muted/50"
              >
                <td className="py-3">
                  <Link
                    href={`/rentals/leases/${lease.id}?lang=${lang}`}
                    className="hover:underline"
                  >
                    {unit
                      ? `${unit.property_name} • ${unit.unit_number}`
                      : `#${lease.unit_id}`}
                  </Link>
                </td>
                <td className="py-3">{tenant?.name ?? `#${lease.tenant_id}`}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[lease.status]}`}
                  >
                    {t(`leaseStatus.${lease.status}`)}
                  </span>
                </td>
                <td className="py-3">{formatDate(lease.start_date, lang)}</td>
                <td className="py-3">{formatDate(lease.end_date, lang)}</td>
                <td className="py-3">{formatCurrency(lease.monthly_rent, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}