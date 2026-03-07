import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UnitForm } from '@/components/rentals/unit-form';
import { getAllProperties } from '@/lib/db/rentals-properties';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function NewRentalUnitPage() {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const properties = await getAllProperties();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('newUnit.title')}</h2>
          <p className="text-muted-foreground">{t('newUnit.subtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/rentals?lang=${lang}`}>{t('detail.backToInventory')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('newUnit.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('newUnit.noProperties')}</p>
          ) : (
            <UnitForm
              mode="create"
              lang={lang}
              properties={properties}
              cancelHref={`/rentals?lang=${lang}`}
              redirectOnSuccess={`/rentals?lang=${lang}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
