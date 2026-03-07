'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lease, LeaseStatus } from '@/lib/db/types';
import { Tenant } from '@/lib/db/types';
import { UnitInventoryRow } from '@/lib/db/rentals-units';
import { transitionLeaseAction } from '@/lib/actions/rentals';

const STATUS_BADGE_STYLES: Record<LeaseStatus, string> = {
  Draft: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-blue-100 text-blue-700',
  Active: 'bg-green-100 text-green-700',
  Expired: 'bg-gray-100 text-gray-700',
  Terminated: 'bg-red-100 text-red-700',
};

interface LeaseDetailClientProps {
  lang: string;
  lease: Lease;
  tenant: Tenant | null;
  unit: UnitInventoryRow | null;
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

export function LeaseDetailClient({
  lang,
  lease,
  tenant,
  unit,
}: LeaseDetailClientProps) {
  const t = useTranslations('rentals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const validTransitions: Record<LeaseStatus, { status: LeaseStatus; label: string; needsConfirm: boolean }[]> = {
    Draft: [{ status: 'Pending', label: t('leases.transition.toPending'), needsConfirm: false }],
    Pending: [{ status: 'Active', label: t('leases.transition.toActive'), needsConfirm: false }],
    Active: [
      { status: 'Expired', label: t('leases.transition.toExpired'), needsConfirm: false },
      { status: 'Terminated', label: t('leases.transition.toTerminated'), needsConfirm: true },
    ],
    Expired: [],
    Terminated: [],
  };

  const transitions = validTransitions[lease.status] || [];

  async function handleTransition(newStatus: LeaseStatus) {
    // Handle confirmation for terminate
    if (newStatus === 'Terminated') {
      const confirmed = window.confirm(t('leases.transition.confirmMessage'));
      if (!confirmed) return;
    }

    setIsTransitioning(true);
    setTransitionError(null);

    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      const result = await transitionLeaseAction(lease.id, formData);

      if (!result.success) {
        setTransitionError(result.error ?? t('form.saveError'));
        setIsTransitioning(false);
        return;
      }

      router.refresh();
    } catch {
      setTransitionError(t('form.saveError'));
    }

    setIsTransitioning(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            {unit ? `${unit.property_name} • ${unit.unit_number}` : `Lease #${lease.id}`}
          </h2>
          <p className="text-muted-foreground">{t('leases.detail.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rentals/leases?lang=${lang}`}>{t('detail.backToList')}</Link>
          </Button>
          <Button asChild>
            <Link href={`/rentals/leases/${lease.id}/edit?lang=${lang}`}>{t('detail.edit')}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.detail.leaseInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.tenant')}</p>
            <p className="font-medium">{tenant?.name ?? `#${lease.tenant_id}`}</p>
            {tenant?.email && <p className="text-sm text-muted-foreground">{tenant.email}</p>}
            {tenant?.phone && <p className="text-sm text-muted-foreground">{tenant.phone}</p>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.unit')}</p>
            <p className="font-medium">
              {unit
                ? `${unit.property_name} • ${unit.unit_number}`
                : `#${lease.unit_id}`}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.status')}</p>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[lease.status]}`}
            >
              {t(`leaseStatus.${lease.status}`)}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.form.leaseType')}</p>
            <p className="font-medium">{lease.lease_type || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.startDate')}</p>
            <p className="font-medium">{formatDate(lease.start_date, lang)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.endDate')}</p>
            <p className="font-medium">{formatDate(lease.end_date, lang)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.columns.rent')}</p>
            <p className="font-medium">{formatCurrency(lease.monthly_rent, lang)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.form.securityDeposit')}</p>
            <p className="font-medium">{formatCurrency(lease.security_deposit, lang)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.detail.additionalInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.form.petsAllowed')}</p>
            <p className="font-medium">{lease.pets_allowed ? tCommon('yes') : tCommon('no')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.form.utilitiesIncluded')}</p>
            <p className="font-medium">{lease.utilities_included ? tCommon('yes') : tCommon('no')}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('leases.form.parkingSpot')}</p>
            <p className="font-medium">{lease.parking_spot || '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.detail.statusTransitions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {transitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('leases.detail.noTransitions')}</p>
          ) : (
            <>
              {transitionError && (
                <p className="text-sm text-red-600">{transitionError}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {transitions.map((transition) => (
                  <Button
                    key={transition.status}
                    variant="outline"
                    onClick={() => handleTransition(transition.status)}
                    disabled={isTransitioning}
                  >
                    {transition.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}