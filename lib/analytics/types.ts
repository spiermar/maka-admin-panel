export interface MonthlyData {
  month: string; // YYYY-MM format
  income: string;
  expenses: string;
  net: string;
}

export interface CategoryBreakdown {
  category_id: number | null;
  category_name: string;
  category_path: string;
  amount: string;
  percentage: number;
}

export interface AccountSummary {
  total_balance: string;
  monthly_income: string;
  monthly_expenses: string;
  net_cash_flow: string;
}
