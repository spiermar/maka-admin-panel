import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentForm } from '@/components/rentals/payment-form';
import { getLeaseOptions } from '@/lib/db/rentals-leases';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function NewPaymentPage() {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const leases = await getLeaseOptions('Active');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('payments.recordPaymentTitle')}</h2>
          <p className="text-muted-foreground">{t('payments.recordPaymentSubtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/rentals/payments?lang=${lang}`}>{t('detail.backToList')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('payments.noActiveLeases')}</p>
          ) : (
            <PaymentForm
              leases={leases}
              lang={lang}
              cancelHref={`/rentals/payments?lang=${lang}`}
              redirectOnSuccess={`/rentals/payments?lang=${lang}`}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}