'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalysisCategoryBreakdown } from '@/lib/analytics/transaction-analysis';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface CategoryBreakdownChartProps {
  data: AnalysisCategoryBreakdown[];
  title: string;
  emptyText: string;
  color: string;
  locale: string;
}

function formatCurrency(amount: unknown, locale: string) {
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
}

export function CategoryBreakdownChart({
  data,
  title,
  emptyText,
  color,
  locale,
}: CategoryBreakdownChartProps) {
  const chartData = data.map((item) => ({
    category: item.category_path || item.category_name,
    amount: parseFloat(item.amount),
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
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => formatCurrency(value, locale)} />
              <YAxis
                dataKey="category"
                type="category"
                width={160}
              />
              <Tooltip formatter={(value) => formatCurrency(value, locale)} />
              <Bar dataKey="amount" fill={color} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
