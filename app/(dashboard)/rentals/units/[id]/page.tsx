import { notFound } from 'next/navigation';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { getUnitOccupancySnapshot } from '@/lib/db/rentals-occupancy';
import { getUnitInventoryById } from '@/lib/db/rentals-units';
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

  const [lang, unit, occupancy] = await Promise.all([
    getLangFromUrl(),
    getUnitInventoryById(unitId),
    getUnitOccupancySnapshot(unitId),
  ]);

  if (!unit) {
    notFound();
  }

  return <RentalUnitDetailClient lang={lang} unit={unit} occupancy={occupancy} />;
}
