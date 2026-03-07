import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeaseForm } from '@/components/rentals/lease-form';
import { getAllTenants } from '@/lib/db/rentals-tenants';
import { listUnitsInventory } from '@/lib/db/rentals-units';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function NewLeasePage() {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const [tenants, units] = await Promise.all([
    getAllTenants(),
    listUnitsInventory(),
  ]);

  // Filter to only Vacant units
  const availableUnits = units.filter((u) => u.current_status === 'Vacant');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('leases.newLeaseTitle')}</h2>
          <p className="text-muted-foreground">{t('leases.newLeaseSubtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/rentals/leases?lang=${lang}`}>{t('detail.backToList')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('leases.noTenants')}</p>
          ) : availableUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('leases.noAvailableUnits')}</p>
          ) : (
            <LeaseForm
              mode="create"
              lang={lang}
              tenants={tenants}
              units={availableUnits}
              cancelHref={`/rentals/leases?lang=${lang}`}
              redirectOnSuccess={`/rentals/leases?lang=${lang}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}