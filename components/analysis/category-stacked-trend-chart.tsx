'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StackedTrendPoint } from '@/lib/analytics/transaction-analysis';
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

const STACK_COLORS = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#65a30d',
  '#c026d3',
  '#ca8a04',
  '#4f46e5',
  '#64748b',
];

interface CategoryStackedTrendChartProps {
  data: StackedTrendPoint[];
  title: string;
  emptyText: string;
  locale: string;
}

function formatCurrency(amount: unknown, locale: string) {
  const parsedAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'pt-BR' ? 'BRL' : 'USD',
  }).format(Number.isNaN(parsedAmount) ? 0 : parsedAmount);
}

export function CategoryStackedTrendChart({
  data,
  title,
  emptyText,
  locale,
}: CategoryStackedTrendChartProps) {
  const stackKeys = Array.from(
    new Set(data.flatMap((point) => Object.keys(point).filter((key) => key !== 'period')))
  );
  const chartData = data.map((point) => {
    const parsedPoint: Record<string, string | number> = {
      period: point.period,
    };

    for (const key of stackKeys) {
      parsedPoint[key] = parseFloat(point[key] ?? '0');
    }

    return parsedPoint;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || stackKeys.length === 0 ? (
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
              {stackKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="category"
                  fill={STACK_COLORS[index % STACK_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
