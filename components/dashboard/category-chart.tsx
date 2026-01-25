'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CategoryChartProps {
  data: Array<{
    category_name: string;
    amount: string;
    percentage: number;
  }>;
  title: string;
  color: string;
}

export function CategoryChart({ data, title, color }: CategoryChartProps) {
  const chartData = data.map((item) => ({
    category: item.category_name,
    amount: parseFloat(item.amount),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="amount" fill={color} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
