'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tenant } from '@/lib/db/types';
import { Lease } from '@/lib/db/types';

interface TenantDetailClientProps {
  lang: string;
  tenant: Tenant;
  activeLease: Lease | null;
  leases: Lease[];
  totalBalance: number;
}

function formatDate(value: string, lang: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const LEASE_STATUS_STYLES: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Active: 'bg-green-100 text-green-700',
  Expired: 'bg-red-100 text-red-700',
  Terminated: 'bg-red-100 text-red-700',
};

function formatCurrency(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function TenantDetailClient({
  lang,
  tenant,
  activeLease,
  totalBalance,
}: TenantDetailClientProps) {
  const t = useTranslations('rentals');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{tenant.name}</h2>
          <p className="text-muted-foreground">{t('tenants.detail.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rentals/tenants?lang=${lang}`}>
              {t('tenants.detail.backToList')}
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/rentals/tenants/${tenant.id}/edit?lang=${lang}`}>
              {t('tenants.detail.editTenant')}
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.detail.tenantInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('tenants.form.name')}</p>
            <p className="font-medium">{tenant.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('tenants.form.phone')}</p>
            <p className="font-medium">{tenant.phone || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('tenants.form.email')}</p>
            <p className="font-medium">{tenant.email || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('tenants.detail.totalBalance')}</p>
            <p className={`font-medium ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(totalBalance, lang)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.detail.lease')}</CardTitle>
        </CardHeader>
        <CardContent>
          {activeLease ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${LEASE_STATUS_STYLES[activeLease.status]}`}
                >
                  {activeLease.status}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t('tenants.detail.unit')}</p>
                  <p className="font-medium">#{activeLease.unit_id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('tenants.detail.dates')}</p>
                  <p className="font-medium">
                    {formatDate(activeLease.start_date, lang)} -{' '}
                    {formatDate(activeLease.end_date, lang)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('tenants.detail.rent')}</p>
                  <p className="font-medium">${activeLease.monthly_rent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('tenants.detail.deposit')}</p>
                  <p className="font-medium">${activeLease.security_deposit.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('tenants.detail.noLease')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}