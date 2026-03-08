import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeaseListTable } from '@/components/rentals/leases-list-table';
import { getAllLeases } from '@/lib/db/rentals-leases';
import { getAllTenants } from '@/lib/db/rentals-tenants';
import { listUnitsInventory } from '@/lib/db/rentals-units';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { LeaseStatus } from '@/lib/db/types';

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { status } = await searchParams;

  const [leases, tenants, units] = await Promise.all([
    getAllLeases(status ? { status: status as LeaseStatus } : undefined),
    getAllTenants(),
    listUnitsInventory(),
  ]);

  // Create lookup maps
  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const unitMap = new Map(units.map((u) => [u.id, u]));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('leases.title')}</h2>
          <p className="text-muted-foreground">{t('leases.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href={`/rentals/leases/new?lang=${lang}`}>{t('leases.newLease')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('leases.noLeases')}</p>
          ) : (
            <LeaseListTable
              leases={leases}
              tenants={tenantMap}
              units={unitMap}
              lang={lang}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}