import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CategoryTrendRow } from '@/lib/analytics/transaction-analysis';

interface CategoryTrendTableProps {
  rows: CategoryTrendRow[];
  periods: string[];
  title: string;
  emptyText: string;
  locale: string;
  labels: {
    category: string;
    type: string;
    total: string;
    income: string;
    expense: string;
  };
}

function formatCurrency(amount: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(parseFloat(amount));
}

export function CategoryTrendTable({
  rows,
  periods,
  title,
  emptyText,
  locale,
  labels,
}: CategoryTrendTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{labels.category}</TableHead>
              <TableHead>{labels.type}</TableHead>
              <TableHead className="text-right">{labels.total}</TableHead>
              {periods.map((period) => (
                <TableHead key={period} className="text-right">
                  {period}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3 + periods.length}
                  className="text-center text-muted-foreground"
                >
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.categoryKey}>
                  <TableCell className="font-medium">
                    {row.categoryPath}
                  </TableCell>
                  <TableCell>
                    {row.categoryType === 'income' ? labels.income : labels.expense}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.total, locale)}
                  </TableCell>
                  {periods.map((period) => (
                    <TableCell key={period} className="text-right">
                      {formatCurrency(row.periods[period] ?? '0', locale)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
