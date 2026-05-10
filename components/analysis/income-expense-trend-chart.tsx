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
}

export function IncomeExpenseTrendChart({
  data,
  title,
  emptyText,
}: IncomeExpenseTrendChartProps) {
  const chartData = data.map((item) => ({
    period: item.period,
    Income: parseFloat(item.income),
    Expenses: parseFloat(item.expenses),
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
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" />
              <Bar dataKey="Expenses" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
