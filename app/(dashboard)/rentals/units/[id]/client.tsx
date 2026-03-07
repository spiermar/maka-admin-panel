'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitOccupancySnapshot } from '@/lib/db/rentals-occupancy';
import { UnitInventoryRow } from '@/lib/db/rentals-units';

const STATUS_BADGE_STYLES: Record<'Occupied' | 'Vacant' | 'Unavailable', string> = {
  Vacant: 'bg-green-100 text-green-700',
  Occupied: 'bg-blue-100 text-blue-700',
  Unavailable: 'bg-amber-100 text-amber-800',
};

interface RentalUnitDetailClientProps {
  lang: string;
  unit: UnitInventoryRow;
  occupancy: UnitOccupancySnapshot;
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
    </div>
  );
}
