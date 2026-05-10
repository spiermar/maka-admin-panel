'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { IncomeExpenseTrendPoint } from '@/lib/analytics/transaction-analysis';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface IncomeExpenseTrendChartProps {
  data: IncomeExpenseTrendPoint[];
  title: string;
  emptyText: string;
  locale: string;
  labels: {
    income: string;
    expenses: string;
  };
}

function formatCurrency(amount: unknown, locale: string) {
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
}

export function IncomeExpenseTrendChart({
  data,
  title,
  emptyText,
  locale,
  labels,
}: IncomeExpenseTrendChartProps) {
  const chartData = data.map((item) => ({
    period: item.period,
    income: parseFloat(item.income),
    expenses: parseFloat(item.expenses),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => formatCurrency(value, locale)} />
              <Tooltip formatter={(value) => formatCurrency(value, locale)} />
              <Legend />
              <Bar dataKey="income" name={labels.income} fill="#22c55e" />
              <Bar dataKey="expenses" name={labels.expenses} fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
