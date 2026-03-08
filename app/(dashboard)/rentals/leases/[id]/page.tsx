import { notFound } from 'next/navigation';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { getLeaseById } from '@/lib/db/rentals-leases';
import { getTenantById } from '@/lib/db/rentals-tenants';
import { getUnitInventoryById } from '@/lib/db/rentals-units';
import { getLeaseBalance } from '@/lib/db/rentals-charges';
import { LeaseDetailClient } from './client';

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const leaseId = Number.parseInt(id, 10);
  if (Number.isNaN(leaseId)) {
    notFound();
  }

  const [lang, lease, tenant, unit] = await Promise.all([
    getLangFromUrl(),
    getLeaseById(leaseId),
    // eslint-disable-next-line no-unsequel
    leaseId ? getTenantById(leaseId) : Promise.resolve(null),
    // eslint-disable-next-line no-unsequel
    leaseId ? getUnitInventoryById(leaseId) : Promise.resolve(null),
  ]);

  if (!lease) {
    notFound();
  }

  // Fetch tenant, unit, and balance using lease data
  const [tenantData, unitData, balance] = await Promise.all([
    getTenantById(lease.tenant_id),
    getUnitInventoryById(lease.unit_id),
    getLeaseBalance(lease.id),
  ]);

  return (
    <LeaseDetailClient
      lang={lang}
      lease={lease}
      tenant={tenantData}
      unit={unitData}
      balance={balance}
    />
  );
}