import { notFound } from 'next/navigation';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { getUnitOccupancySnapshot } from '@/lib/db/rentals-occupancy';
import { getUnitInventoryById } from '@/lib/db/rentals-units';
import { getTenantByUnitId } from '@/lib/db/rentals-tenants';
import { getAllLeases } from '@/lib/db/rentals-leases';
import { RentalUnitDetailClient } from './client';

export default async function RentalUnitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unitId = Number.parseInt(id, 10);
  if (Number.isNaN(unitId)) {
    notFound();
  }

  const [lang, unit, occupancy, tenant, leases] = await Promise.all([
    getLangFromUrl(),
    getUnitInventoryById(unitId),
    getUnitOccupancySnapshot(unitId),
    getTenantByUnitId(unitId),
    getAllLeases({ unit_id: unitId }),
  ]);

  if (!unit) {
    notFound();
  }

  // Find the active lease
  const activeLease = leases.find((l) => l.status === 'Active') || null;

  return (
    <RentalUnitDetailClient
      lang={lang}
      unit={unit}
      occupancy={occupancy}
      tenant={tenant}
      activeLease={activeLease}
    />
  );
}
