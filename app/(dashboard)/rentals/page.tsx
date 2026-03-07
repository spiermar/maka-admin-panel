import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function RentalsPage() {
  const t = await getTranslations('rentals');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('title')}</h2>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('comingSoonTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('comingSoonDescription')}
        </CardContent>
      </Card>
    </div>
  );
}
