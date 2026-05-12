import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountSummary } from '@/lib/analytics/cash-flow';
import { getRentalOperationSummary } from '@/lib/analytics/rentals-operations';
import { formatCurrency } from '@/lib/i18n/format';
import { getLangFromUrl } from '@/lib/i18n/utils';
import Link from 'next/link';

export async function SummaryCards() {
  const t = await getTranslations('dashboard');
  const locale = await getLangFromUrl();
  const summary = await getAccountSummary();
  const rentalSummary = await getRentalOperationSummary();

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('totalBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.total_balance, locale)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('monthlyIncome')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.monthly_income, locale)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('monthlyExpenses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.monthly_expenses, locale)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('netCashFlow')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                parseFloat(summary.net_cash_flow) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(summary.net_cash_flow, locale)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rental Operations Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('vacantUnits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/rentals/units?status=Vacant" className="text-2xl font-bold hover:underline">
              {rentalSummary.vacant_count}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('occupiedUnits')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/rentals/units?status=Occupied" className="text-2xl font-bold hover:underline">
              {rentalSummary.occupied_count}
            </Link>
          </CardContent>
        </Card>

        <Card className={rentalSummary.delinquent_count > 0 ? 'border-red-500' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('delinquentAccounts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/rentals/overdue" className={`text-2xl font-bold hover:underline ${rentalSummary.delinquent_count > 0 ? 'text-red-600' : ''}`}>
              {rentalSummary.delinquent_count}
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
