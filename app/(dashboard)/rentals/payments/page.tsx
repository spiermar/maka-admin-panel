import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getAllPaymentsWithLeaseInfo, PaymentFilters } from '@/lib/db/rentals-payments';
import { getLangFromUrl } from '@/lib/i18n/utils';
import { PaymentsListTable } from '@/components/rentals/payments-list-table';

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ lease_id?: string; start_date?: string; end_date?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { lease_id, start_date, end_date } = await searchParams;

  const filters: PaymentFilters = {};
  if (lease_id) {
    filters.lease_id = parseInt(lease_id, 10);
  }
  if (start_date) {
    filters.start_date = start_date;
  }
  if (end_date) {
    filters.end_date = end_date;
  }

  const payments = await getAllPaymentsWithLeaseInfo(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('payments.title')}</h2>
          <p className="text-muted-foreground">{t('payments.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href={`/rentals/payments/new?lang=${lang}`}>
            {t('payments.addPayment')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('payments.listTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentsListTable payments={payments} lang={lang} />
        </CardContent>
      </Card>
    </div>
  );
}