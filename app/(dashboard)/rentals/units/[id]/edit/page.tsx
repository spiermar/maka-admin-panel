import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitForm } from '@/components/rentals/unit-form';
import { getAllProperties } from '@/lib/db/rentals-properties';
import { getUnitInventoryById } from '@/lib/db/rentals-units';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function EditRentalUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const unitId = Number.parseInt(id, 10);
  if (Number.isNaN(unitId)) {
    notFound();
  }

  const t = await getTranslations('rentals');
  const [lang, unit, properties] = await Promise.all([
    getLangFromUrl(),
    getUnitInventoryById(unitId),
    getAllProperties(),
  ]);

  if (!unit) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('editUnit.title')}</h2>
        <p className="text-muted-foreground">{t('editUnit.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('editUnit.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitForm
            mode="edit"
            lang={lang}
            unitId={unit.id}
            properties={properties}
            cancelHref={`/rentals/units/${unit.id}?lang=${lang}`}
            redirectOnSuccess={`/rentals/units/${unit.id}?lang=${lang}`}
            initialValues={{
              property_id: unit.property_id.toString(),
              unit_number: unit.unit_number,
              building_label: unit.building_label ?? '',
              unit_type: unit.unit_type,
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              status: unit.current_status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
