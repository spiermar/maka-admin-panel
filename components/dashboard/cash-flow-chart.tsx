'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CashFlowChartProps {
  data: Array<{
    month: string;
    income: string;
    expenses: string;
    net: string;
  }>;
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    Income: parseFloat(item.income),
    Expenses: parseFloat(item.expenses),
    Net: parseFloat(item.net),
  })).reverse(); // Show oldest to newest

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Income"
              stroke="#22c55e"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Expenses"
              stroke="#ef4444"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="Net"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
