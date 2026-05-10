import { queryMany, queryOne } from '@/lib/db';
import type { CategoryType } from '@/lib/db/types';
import type {
  AnalysisFilters,
  ResolvedAnalysisGrouping,
} from '@/lib/analysis/filters';

export interface AnalysisSummary {
  income: string;
  expenses: string;
}

export interface IncomeExpenseTrendPoint {
  period: string;
  income: string;
  expenses: string;
}

export interface AnalysisCategoryBreakdown {
  category_id: number | null;
  category_name: string;
  category_path: string;
  amount: string;
  percentage: number;
}

export type StackedTrendPoint = {
  period: string;
} & Record<string, string>;

export interface CategoryTrendRow {
  categoryKey: string;
  categoryType: CategoryType;
  categoryPath: string;
  total: string;
  periods: Record<string, string>;
}

export interface TransactionAnalysisData {
  summary: AnalysisSummary;
  incomeExpenseTrend: IncomeExpenseTrendPoint[];
  expenseBreakdown: AnalysisCategoryBreakdown[];
  incomeBreakdown: AnalysisCategoryBreakdown[];
  expenseStackedTrend: StackedTrendPoint[];
  incomeStackedTrend: StackedTrendPoint[];
  categoryTrends: CategoryTrendRow[];
}

export interface AnalysisWhereClause {
  whereClause: string;
  params: unknown[];
}

interface BreakdownQueryRow {
  category_id: number | null;
  category_name: string;
  category_path: string;
  amount: string;
}

interface StackedTrendQueryRow {
  period: string;
  category_key: string;
  category_path: string;
  amount: string;
}

interface CategoryTrendQueryRow extends StackedTrendQueryRow {
  category_type: CategoryType;
}

const ZERO_SUMMARY: AnalysisSummary = {
  income: '0.00',
  expenses: '0.00',
};

const CATEGORY_HIERARCHY_CTE = `WITH RECURSIVE category_hierarchy AS (
       SELECT
         id,
         name,
         parent_id,
         category_type,
         name::text as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT
         c.id,
         c.name,
         c.parent_id,
         c.category_type,
         ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )`;

export function emptyTransactionAnalysis(): TransactionAnalysisData {
  return {
    summary: { ...ZERO_SUMMARY },
    incomeExpenseTrend: [],
    expenseBreakdown: [],
    incomeBreakdown: [],
    expenseStackedTrend: [],
    incomeStackedTrend: [],
    categoryTrends: [],
  };
}

export function periodExpression(grouping: ResolvedAnalysisGrouping): string {
  if (grouping === 'daily') {
    return "TO_CHAR(t.date, 'YYYY-MM-DD')";
  }

  if (grouping === 'weekly') {
    return "TO_CHAR(DATE_TRUNC('week', t.date), 'YYYY-MM-DD')";
  }

  return "TO_CHAR(DATE_TRUNC('month', t.date), 'YYYY-MM')";
}

export function buildAnalysisWhereClause(filters: AnalysisFilters): AnalysisWhereClause {
  const params: unknown[] = [filters.from, filters.to];
  const clauses = ['t.date >= $1', 't.date <= $2'];

  if (filters.accountId) {
    params.push(filters.accountId);
    clauses.push(`t.account_id = $${params.length}`);
  }

  if (filters.hasCategoryFilter) {
    const categoryClauses: string[] = [];

    if (filters.includedCategoryIds.length > 0) {
      params.push(filters.includedCategoryIds);
      categoryClauses.push(`t.category_id = ANY($${params.length}::int[])`);
    }

    if (filters.includeUncategorizedIncome) {
      categoryClauses.push('(t.category_id IS NULL AND t.amount > 0)');
    }

    if (filters.includeUncategorizedExpense) {
      categoryClauses.push('(t.category_id IS NULL AND t.amount < 0)');
    }

    clauses.push(`(${categoryClauses.length > 0 ? categoryClauses.join(' OR ') : 'FALSE'})`);
  }

  return {
    whereClause: `WHERE ${clauses.join(' AND ')}`,
    params,
  };
}

export function groupStackedTrendRows(rows: StackedTrendQueryRow[]): StackedTrendPoint[] {
  const categoryTotals = new Map<string, { categoryPath: string; total: number }>();

  for (const row of rows) {
    const total = categoryTotals.get(row.category_key) ?? {
      categoryPath: row.category_path,
      total: 0,
    };
    total.total += Number.parseFloat(row.amount);
    categoryTotals.set(row.category_key, total);
  }

  const topCategoryKeys = new Set(
    [...categoryTotals.entries()]
      .sort(
        ([categoryKeyA, a], [categoryKeyB, b]) =>
          b.total - a.total ||
          a.categoryPath.localeCompare(b.categoryPath) ||
          categoryKeyA.localeCompare(categoryKeyB)
      )
      .slice(0, 10)
      .map(([categoryKey]) => categoryKey)
  );
  const periods = new Map<string, Record<string, number>>();

  for (const row of rows) {
    const point = periods.get(row.period) ?? {};
    const categoryName = topCategoryKeys.has(row.category_key) ? row.category_path : 'Other';

    point[categoryName] = (point[categoryName] ?? 0) + Number.parseFloat(row.amount);
    periods.set(row.period, point);
  }

  return [...periods.entries()]
    .sort(([periodA], [periodB]) => periodA.localeCompare(periodB))
    .map(([period, values]) => {
      const point: StackedTrendPoint = { period };

      for (const [categoryName, amount] of Object.entries(values)) {
        point[categoryName] = amount.toFixed(2);
      }

      return point;
    });
}

export async function getTransactionAnalysis(
  filters: AnalysisFilters
): Promise<TransactionAnalysisData> {
  if (filters.hasInvalidDateRange) {
    return emptyTransactionAnalysis();
  }

  const { whereClause, params } = buildAnalysisWhereClause(filters);
  const periodSql = periodExpression(filters.resolvedGrouping);
  const includedSql = includedTransactionCondition(filters);
  const summary = await queryOne<AnalysisSummary>(
    `${CATEGORY_HIERARCHY_CTE}
     SELECT
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'income' THEN t.amount
         ${filters.includeUncategorizedIncome ? 'WHEN t.category_id IS NULL AND t.amount > 0 THEN t.amount' : ''}
         ELSE 0
       END), 0)::decimal(15,2) as income,
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'expense' THEN ABS(t.amount)
         ${filters.includeUncategorizedExpense ? 'WHEN t.category_id IS NULL AND t.amount < 0 THEN ABS(t.amount)' : ''}
         ELSE 0
       END), 0)::decimal(15,2) as expenses
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereClause}
       AND (${includedSql})`,
    params
  );

  const incomeExpenseTrend = await queryMany<IncomeExpenseTrendPoint>(
    `${CATEGORY_HIERARCHY_CTE}
     SELECT
       ${periodSql} as period,
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'income' THEN t.amount
         ${filters.includeUncategorizedIncome ? 'WHEN t.category_id IS NULL AND t.amount > 0 THEN t.amount' : ''}
         ELSE 0
       END), 0)::decimal(15,2) as income,
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'expense' THEN ABS(t.amount)
         ${filters.includeUncategorizedExpense ? 'WHEN t.category_id IS NULL AND t.amount < 0 THEN ABS(t.amount)' : ''}
         ELSE 0
       END), 0)::decimal(15,2) as expenses
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereClause}
       AND (${includedSql})
     GROUP BY ${periodSql}
     ORDER BY period ASC`,
    params
  );

  const expenseBreakdown = withPercentages(
    await queryMany<BreakdownQueryRow>(
      breakdownQuery('expense', whereClause, includedSql),
      params
    )
  );
  const incomeBreakdown = withPercentages(
    await queryMany<BreakdownQueryRow>(
      breakdownQuery('income', whereClause, includedSql),
      params
    )
  );
  const expenseStackedTrendRows = await queryMany<StackedTrendQueryRow>(
    stackedTrendQuery('expense', periodSql, whereClause, includedSql),
    params
  );
  const incomeStackedTrendRows = await queryMany<StackedTrendQueryRow>(
    stackedTrendQuery('income', periodSql, whereClause, includedSql),
    params
  );
  const categoryTrendRows = await queryMany<CategoryTrendQueryRow>(
    categoryTrendQuery(periodSql, whereClause, includedSql),
    params
  );

  return {
    summary: summary ?? { ...ZERO_SUMMARY },
    incomeExpenseTrend,
    expenseBreakdown,
    incomeBreakdown,
    expenseStackedTrend: groupStackedTrendRows(expenseStackedTrendRows),
    incomeStackedTrend: groupStackedTrendRows(incomeStackedTrendRows),
    categoryTrends: groupCategoryTrendRows(categoryTrendRows),
  };
}

function includedTransactionCondition(filters: AnalysisFilters): string {
  const clauses = ["ch.category_type IN ('income', 'expense')"];

  if (filters.includeUncategorizedIncome) {
    clauses.push('(t.category_id IS NULL AND t.amount > 0)');
  }

  if (filters.includeUncategorizedExpense) {
    clauses.push('(t.category_id IS NULL AND t.amount < 0)');
  }

  return clauses.join(' OR ');
}

function typeCondition(categoryType: CategoryType): string {
  if (categoryType === 'income') {
    return "(ch.category_type = 'income' OR (t.category_id IS NULL AND t.amount > 0))";
  }

  return "(ch.category_type = 'expense' OR (t.category_id IS NULL AND t.amount < 0))";
}

function amountExpression(categoryType: CategoryType): string {
  return categoryType === 'income' ? 't.amount' : 'ABS(t.amount)';
}

function breakdownQuery(
  categoryType: CategoryType,
  whereClause: string,
  includedSql: string
): string {
  const amountSql = amountExpression(categoryType);

  return `${CATEGORY_HIERARCHY_CTE}
     SELECT
       t.category_id,
       COALESCE(ch.name, 'Uncategorized') as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path,
       COALESCE(SUM(${amountSql}), 0)::decimal(15,2) as amount
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereClause}
       AND (${includedSql})
       AND ${typeCondition(categoryType)}
     GROUP BY t.category_id, ch.name, ch.full_path
     HAVING SUM(${amountSql}) <> 0
     ORDER BY amount DESC`;
}

function stackedTrendQuery(
  categoryType: CategoryType,
  periodSql: string,
  whereClause: string,
  includedSql: string
): string {
  const amountSql = amountExpression(categoryType);

  return `${CATEGORY_HIERARCHY_CTE}
     SELECT
       ${periodSql} as period,
       CASE
         WHEN t.category_id IS NULL THEN '${categoryType}-uncategorized'
         ELSE '${categoryType}-' || t.category_id::text
       END as category_key,
       COALESCE(ch.full_path, 'Uncategorized') as category_path,
       COALESCE(SUM(${amountSql}), 0)::decimal(15,2) as amount
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereClause}
       AND (${includedSql})
       AND ${typeCondition(categoryType)}
     GROUP BY ${periodSql}, category_key, category_path
     HAVING SUM(${amountSql}) <> 0
     ORDER BY period ASC, amount DESC`;
}

function categoryTrendQuery(
  periodSql: string,
  whereClause: string,
  includedSql: string
): string {
  return `${CATEGORY_HIERARCHY_CTE}
     SELECT
       ${periodSql} as period,
       CASE
         WHEN t.category_id IS NULL AND t.amount > 0 THEN 'income-uncategorized'
         WHEN t.category_id IS NULL AND t.amount < 0 THEN 'expense-uncategorized'
         ELSE ch.category_type || '-' || t.category_id::text
       END as category_key,
       CASE
         WHEN t.category_id IS NULL AND t.amount > 0 THEN 'income'
         WHEN t.category_id IS NULL AND t.amount < 0 THEN 'expense'
         ELSE ch.category_type
       END as category_type,
       COALESCE(ch.full_path, 'Uncategorized') as category_path,
       COALESCE(SUM(CASE
         WHEN ch.category_type = 'income' THEN t.amount
         WHEN ch.category_type = 'expense' THEN ABS(t.amount)
         WHEN t.category_id IS NULL THEN ABS(t.amount)
         ELSE 0
       END), 0)::decimal(15,2) as amount
     FROM transactions t
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereClause}
       AND (${includedSql})
     GROUP BY ${periodSql}, category_key, category_type, category_path
     HAVING COALESCE(SUM(CASE
       WHEN ch.category_type = 'income' THEN t.amount
       WHEN ch.category_type = 'expense' THEN ABS(t.amount)
       WHEN t.category_id IS NULL THEN ABS(t.amount)
       ELSE 0
     END), 0) <> 0
     ORDER BY category_path ASC, period ASC`;
}

function withPercentages(rows: BreakdownQueryRow[]): AnalysisCategoryBreakdown[] {
  const total = rows.reduce((sum, row) => sum + Number.parseFloat(row.amount), 0);

  return rows.map((row) => ({
    ...row,
    percentage: total > 0 ? (Number.parseFloat(row.amount) / total) * 100 : 0,
  }));
}

function groupCategoryTrendRows(rows: CategoryTrendQueryRow[]): CategoryTrendRow[] {
  const categories = new Map<string, CategoryTrendRow & { numericTotal: number }>();

  for (const row of rows) {
    const amount = Number.parseFloat(row.amount);
    const category = categories.get(row.category_key) ?? {
      categoryKey: row.category_key,
      categoryType: row.category_type,
      categoryPath: row.category_path,
      total: '0.00',
      periods: {},
      numericTotal: 0,
    };

    category.numericTotal += amount;
    category.total = category.numericTotal.toFixed(2);
    category.periods[row.period] = amount.toFixed(2);
    categories.set(row.category_key, category);
  }

  return [...categories.values()]
    .sort(
      (a, b) =>
        b.numericTotal - a.numericTotal ||
        a.categoryPath.localeCompare(b.categoryPath) ||
        a.categoryKey.localeCompare(b.categoryKey)
    )
    .map(({ numericTotal: _numericTotal, ...category }) => category);
}
