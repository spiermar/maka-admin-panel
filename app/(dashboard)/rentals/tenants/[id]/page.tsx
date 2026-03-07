import { notFound } from 'next/navigation';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { getTenantById } from '@/lib/db/rentals-tenants';
import { getAllLeases } from '@/lib/db/rentals-leases';
import { TenantDetailClient } from './client';

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = Number.parseInt(id, 10);
  if (Number.isNaN(tenantId)) {
    notFound();
  }

  const [lang, tenant] = await Promise.all([
    getLangFromUrl(),
    getTenantById(tenantId),
  ]);

  if (!tenant) {
    notFound();
  }

  // Get all leases for this tenant
  const leases = await getAllLeases({ tenant_id: tenantId });
  
  // Get active lease (if any)
  const activeLease = leases.find((l) => l.status === 'Active');

  return (
    <TenantDetailClient
      lang={lang}
      tenant={tenant}
      activeLease={activeLease || null}
      leases={leases}
    />
  );
}