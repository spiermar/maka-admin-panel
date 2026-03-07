import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitsInventoryTable } from '@/components/rentals/units-inventory-table';
import { getAllProperties } from '@/lib/db/rentals-properties';
import { listUnitsInventory } from '@/lib/db/rentals-units';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function RentalsPage() {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const [inventory, properties] = await Promise.all([
    listUnitsInventory(),
    getAllProperties(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('inventory.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitsInventoryTable units={inventory} properties={properties} lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}
