import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOverdueBalances } from '@/lib/db/rentals-charges';
import { getLangFromUrl } from '@/lib/i18n/utils';

function formatCurrency(value: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDate(value: string, lang: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function OverduePage({
  searchParams,
}: {
  searchParams: Promise<{ gracePeriod?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { gracePeriod } = await searchParams;
  
  const gracePeriodDays = gracePeriod ? parseInt(gracePeriod, 10) : 5;
  const overdueBalances = await getOverdueBalances(gracePeriodDays);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">{t('overdue.title')}</h2>
        <p className="text-muted-foreground">{t('overdue.subtitle')}</p>
      </div>

      {overdueBalances.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">{t('overdue.noOverdue')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {overdueBalances.length} {overdueBalances.length === 1 ? 'account' : 'accounts'} {t('overdue.withOverdue')}
          </p>
          <Card>
            <CardHeader>
              <CardTitle>{t('overdue.listTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">{t('overdue.tenant')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('overdue.unit')}</th>
                      <th className="text-right py-3 px-4 font-medium">{t('overdue.amount')}</th>
                      <th className="text-left py-3 px-4 font-medium">{t('overdue.oldestDue')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdueBalances.map((balance) => (
                      <tr key={balance.lease_id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{balance.tenant_name}</td>
                        <td className="py-3 px-4">{balance.unit_info}</td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">
                          {formatCurrency(balance.total_overdue, lang)}
                        </td>
                        <td className="py-3 px-4">{formatDate(balance.oldest_due_date, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}