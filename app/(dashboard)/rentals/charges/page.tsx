import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllCharges, ChargeFilters } from '@/lib/db/rentals-charges';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { ChargeStatus } from '@/lib/db/types';
import { ChargesListTable } from '@/components/rentals/charges-list-table';
import { GenerateChargesButton } from './generate-charges-button';

export default async function ChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string; year?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { status, month, year } = await searchParams;

  const filters: ChargeFilters = {};
  if (status) {
    filters.status = status as ChargeStatus;
  }
  if (month && year) {
    filters.month = parseInt(month, 10);
    filters.year = parseInt(year, 10);
  } else if (year) {
    filters.year = parseInt(year, 10);
  }

  const charges = await getAllCharges(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('charges.title')}</h2>
          <p className="text-muted-foreground">{t('charges.subtitle')}</p>
        </div>
        <GenerateChargesButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('charges.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {charges.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('charges.noCharges')}</p>
          ) : (
            <ChargesListTable charges={charges} lang={lang} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}