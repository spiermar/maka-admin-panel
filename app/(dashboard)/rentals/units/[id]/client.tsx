'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitOccupancySnapshot } from '@/lib/db/rentals-occupancy';
import { UnitInventoryRow } from '@/lib/db/rentals-units';
import { Tenant, Lease } from '@/lib/db/types';

const STATUS_BADGE_STYLES: Record<'Occupied' | 'Vacant' | 'Unavailable', string> = {
  Vacant: 'bg-green-100 text-green-700',
  Occupied: 'bg-blue-100 text-blue-700',
  Unavailable: 'bg-amber-100 text-amber-800',
};

const LEASE_STATUS_STYLES: Record<Lease['status'], string> = {
  Draft: 'bg-gray-100 text-gray-700',
  Pending: 'bg-yellow-100 text-yellow-700',
  Active: 'bg-green-100 text-green-700',
  Expired: 'bg-red-100 text-red-700',
  Terminated: 'bg-red-100 text-red-700',
};

interface RentalUnitDetailClientProps {
  lang: string;
  unit: UnitInventoryRow;
  occupancy: UnitOccupancySnapshot;
  tenant: Tenant | null;
  activeLease: Lease | null;
}

function formatDate(value: string, lang: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RentalUnitDetailClient({
  lang,
  unit,
  occupancy,
  tenant,
  activeLease,
}: RentalUnitDetailClientProps) {
  const t = useTranslations('rentals');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">
            {unit.property_name} • {unit.unit_number}
          </h2>
          <p className="text-muted-foreground">{t('detail.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rentals?lang=${lang}`}>{t('detail.backToInventory')}</Link>
          </Button>
          <Button asChild data-testid="unit-detail-edit-link">
            <Link href={`/rentals/units/${unit.id}/edit?lang=${lang}`}>{t('detail.editUnit')}</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.unitInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t('inventory.columns.property')}</p>
            <p className="font-medium">{unit.property_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('inventory.columns.unit')}</p>
            <p className="font-medium">
              {unit.building_label ? `${unit.building_label} • ` : ''}
              {unit.unit_number}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('inventory.columns.type')}</p>
            <p className="font-medium">{unit.unit_type}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('inventory.columns.layout')}</p>
            <p className="font-medium">
              {unit.bedrooms} / {unit.bathrooms}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.occupancy')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">{t('detail.currentStatus')}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[unit.current_status]}`}
              >
                {t(`status.${unit.current_status}`)}
              </span>
              {occupancy.current?.effective_date ? (
                <span className="text-sm text-muted-foreground">
                  {formatDate(occupancy.current.effective_date, lang)}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t('detail.nextStatus')}</p>
            {occupancy.next ? (
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGE_STYLES[occupancy.next.status]}`}
                >
                  {t(`status.${occupancy.next.status}`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(occupancy.next.effective_date, lang)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('detail.noFutureStatus')}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.tenantLease')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {tenant ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{t('detail.tenant')}</p>
                <p className="font-medium">{tenant.name}</p>
                {tenant.email && <p className="text-sm text-muted-foreground">{tenant.email}</p>}
                {tenant.phone && <p className="text-sm text-muted-foreground">{tenant.phone}</p>}
              </div>

              {activeLease ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('detail.leaseStatus')}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${LEASE_STATUS_STYLES[activeLease.status]}`}
                    >
                      {t(`leaseStatus.${activeLease.status}`)}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('detail.startDate')}</p>
                      <p className="font-medium">{formatDate(activeLease.start_date, lang)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('detail.endDate')}</p>
                      <p className="font-medium">{formatDate(activeLease.end_date, lang)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('detail.monthlyRent')}</p>
                      <p className="font-medium">${Number(activeLease.monthly_rent).toFixed(2)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/rentals/leases/${activeLease.id}?lang=${lang}`}>
                      {t('detail.viewLease')}
                    </Link>
                  </Button>
                </>
              ) : (
                <div>
                  <p className="text-sm text-amber-600">{t('detail.noActiveLease')}</p>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('detail.noTenantAssigned')}</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/rentals/tenants/new?lang=${lang}&unitId=${unit.id}`}>
                  {t('detail.addTenant')}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
