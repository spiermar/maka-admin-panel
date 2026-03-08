import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeaseForm } from '@/components/rentals/lease-form';
import { getLeaseById } from '@/lib/db/rentals-leases';
import { getAllTenants } from '@/lib/db/rentals-tenants';
import { listUnitsInventory } from '@/lib/db/rentals-units';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function EditLeasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leaseId = Number.parseInt(id, 10);
  if (Number.isNaN(leaseId)) {
    notFound();
  }

  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();

  const [lease, tenants, units] = await Promise.all([
    getLeaseById(leaseId),
    getAllTenants(),
    listUnitsInventory(),
  ]);

  if (!lease) {
    notFound();
  }

  // Don't allow editing dates for Active leases
  const isActive = lease.status === 'Active';

  // For edit, we allow all units (not just vacant ones)
  // The backend will handle overlap checking
  const availableUnits = units;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('leases.editTitle')}</h2>
          <p className="text-muted-foreground">{t('leases.editSubtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/rentals/leases/${leaseId}?lang=${lang}`}>{t('detail.backToDetail')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('leases.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('leases.noTenants')}</p>
          ) : (
            <LeaseForm
              mode="edit"
              lang={lang}
              tenants={tenants}
              units={availableUnits}
              cancelHref={`/rentals/leases/${leaseId}?lang=${lang}`}
              redirectOnSuccess={`/rentals/leases/${leaseId}?lang=${lang}`}
              leaseId={leaseId}
              initialValues={{
                tenant_id: lease.tenant_id,
                unit_id: lease.unit_id,
                start_date: isActive ? undefined : lease.start_date,
                end_date: isActive ? undefined : lease.end_date,
                monthly_rent: lease.monthly_rent,
                security_deposit: lease.security_deposit,
                lease_type: lease.lease_type ?? undefined,
                pets_allowed: lease.pets_allowed ?? undefined,
                parking_spot: lease.parking_spot ?? undefined,
                utilities_included: lease.utilities_included ?? undefined,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}