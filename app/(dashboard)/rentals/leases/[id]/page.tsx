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

  const [lang, lease] = await Promise.all([
    getLangFromUrl(),
    getLeaseById(leaseId),
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