import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllAccountsWithBalances } from '@/lib/db/accounts';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function AccountsPage() {
  const t = await getTranslations('accounts');
  const locale = await getLangFromUrl();
  const accounts = await getAllAccountsWithBalances();

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: locale === 'pt-BR' ? 'BRL' : 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">
            {t('manageAccounts')}
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {t('noAccounts')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/transactions?accountId=${account.id}&lang=${locale}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      parseFloat(account.balance) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(account.balance)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
