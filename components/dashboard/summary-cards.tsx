import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAccountSummary } from '@/lib/analytics/cash-flow';

export async function SummaryCards() {
  const summary = await getAccountSummary();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${parseFloat(summary.total_balance).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            ${parseFloat(summary.monthly_income).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Monthly Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            ${parseFloat(summary.monthly_expenses).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Net Cash Flow
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
            ${parseFloat(summary.net_cash_flow).toFixed(2)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
