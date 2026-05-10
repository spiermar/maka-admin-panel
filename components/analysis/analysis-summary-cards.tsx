import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AnalysisSummaryCardsProps {
  income: string;
  expenses: string;
  locale: string;
  labels: {
    income: string;
    expenses: string;
  };
}

function formatCurrency(amount: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(parseFloat(amount));
}

export function AnalysisSummaryCards({
  income,
  expenses,
  locale,
  labels,
}: AnalysisSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.income}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(income, locale)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {labels.expenses}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(expenses, locale)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
