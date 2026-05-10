# Transaction Analysis View Design

> **Feature:** Create a transaction analysis view  
> **Issue:** #49  
> **Date:** 2026-05-10

## Overview

Add a dedicated authenticated `/analysis` page for selected-range income and expense analysis. The page helps users understand income and expense trends, category composition, and category totals across a chosen date range. It is inspired by YNAB-style reports, but v1 stays focused on actual transaction analysis rather than budgeting, forecasting, or period comparison.

## Goals

1. Show spending and income breakdowns for the selected date range.
2. Show income and expense trends grouped by day, week, or month.
3. Let users filter analysis by date range, account, and included categories.
4. Support hierarchy-aware category inclusion for the existing 3-level category tree.
5. Keep the analysis URL-driven so views can be refreshed, bookmarked, and shared.

## Scope

The default view uses:

- Date range: Last 3 months
- Accounts: All accounts
- Categories: all income and expense categories included
- Time grouping: Adaptive

The page includes:

- Selected-range total income
- Selected-range total expenses
- Income vs expenses trend chart over time
- Expense category breakdown chart
- Income category breakdown chart
- Expense category stacked trend chart
- Income category stacked trend chart
- Category trend table

Out of scope for v1:

- Net cash flow summary
- Savings rate or expense ratio
- Previous-period deltas
- Forecasting
- Budget targets
- Export
- Saved report views

## User Stories

1. **Analyze a recent range** - A user opens Analysis and sees the last 3 months across all accounts.
2. **Change the range** - A user selects a preset such as This month, Last month, This year, YTD, or Last year.
3. **Use a custom range** - A user selects Custom and provides explicit start and end dates.
4. **Filter by account** - A user narrows the analysis to one account or returns to all accounts.
5. **Control time grouping** - A user keeps Adaptive grouping or explicitly chooses Daily, Weekly, or Monthly.
6. **Include or exclude categories** - A user toggles parent categories, child categories, and uncategorized items to control what appears in the report.
7. **Inspect category composition over time** - A user sees which top categories make up each period's income or expense totals.

## Navigation

Add `Analysis` to the main dashboard navigation between Transactions and Expense Reports. The route is protected by the existing `(dashboard)` layout, so no additional page-level auth guard is needed.

## Filters

Filters are stored in the URL query string.

### Date Range

Date preset options:

- This month
- Last month
- Last 3 months
- Last 90 days
- This year
- YTD
- Last year
- Custom

`Last 3 months` is the default when no date parameters are present. `Custom` uses `from` and `to` date inputs. If Custom is selected but either date is missing or invalid, the parser falls back to Last 3 months.

### Account

The account filter defaults to all accounts. Selecting a specific account filters every chart, metric, and table to transactions for that account.

Unknown account IDs are ignored and treated as all accounts.

### Time Grouping

Grouping options:

- Adaptive
- Daily
- Weekly
- Monthly

Adaptive is the default and resolves to:

- 45 days or less: Daily
- 46-180 days: Weekly
- More than 180 days: Monthly

### Categories

The category inclusion panel is hierarchy-aware and grouped by income and expense categories.

Behavior:

- A parent checkbox toggles all descendants.
- Children can be individually overridden after a parent toggle.
- A parent shows a mixed state when only some descendants are included.
- Uncategorized transactions are represented as separate checkbox rows for income and expense analysis. Positive uncategorized transactions belong to income analysis; negative uncategorized transactions belong to expense analysis.
- If no category include parameter is present, all categories and uncategorized transactions are included.
- Unknown category IDs are ignored.

The URL stores selected category IDs as an include list. This keeps the default compact while allowing a filtered view to be revisited.

## Charts And Data

### Summary Totals

Two compact summary cards show total income and total expenses for the selected range after account and category filters are applied.

### Income Vs Expenses Trend

Chart type: grouped vertical bar chart.

Each bar group represents one selected time bucket. The two bars show income and expenses for that bucket. This chart uses the selected grouping mode, or the resolved grouping mode when Adaptive is selected.

### Expense Category Breakdown

Chart type: horizontal bar chart.

This chart sums all included expenses across the full selected date range, groups by category, and sorts by amount descending.

### Income Category Breakdown

Chart type: horizontal bar chart.

This chart sums all included income across the full selected date range, groups by category, and sorts by amount descending.

### Expense Category Stacked Trend

Chart type: stacked vertical bar chart.

Each bar represents one selected time bucket. Stack segments represent the top 10 expense categories by total amount across the full selected range after filters are applied. Remaining included expense categories are summed as `Other`.

### Income Category Stacked Trend

Chart type: stacked vertical bar chart.

Each bar represents one selected time bucket. Stack segments represent the top 10 income categories by total amount across the full selected range after filters are applied. Remaining included income categories are summed as `Other`.

### Category Trend Table

The table shows one row per included category, with:

- Category path
- Category type
- Total for the full selected range
- One column per selected time bucket

The table uses the same resolved grouping as the trend charts. It provides exact values to complement the charts.

## Amount Rules

- Categorized transactions are classified by `category_type`.
- Income totals use the signed sum of transactions assigned to income categories, plus positive uncategorized transactions when included.
- Expense totals use the absolute value of transactions assigned to expense categories, plus the absolute value of negative uncategorized transactions when included.
- Uncategorized transactions are shown as `Uncategorized` and can be included or excluded independently for income and expense analysis.
- Transactions whose sign does not match category type remain classified by category type, matching the current dashboard analytics behavior.
- Percentages in breakdown charts are calculated against the included total for that income or expense type.
- Top 10 categories for stacked charts are determined after all filters are applied.

## Architecture

### Server Page

`app/(dashboard)/analysis/page.tsx`

- Parses search params into typed analysis filters.
- Fetches accounts and categories.
- Validates account/category IDs against available records.
- Fetches analysis data from the analytics module.
- Passes filter state and data into the client component.

### Client View

`app/(dashboard)/analysis/client.tsx`

- Renders the filter controls, category tree controls, summary cards, charts, and table.
- Updates URL query parameters through App Router navigation.
- Keeps local draft state for custom date inputs where needed.

If the client file becomes too large, split reusable units into `components/analysis/*`, such as:

- `analysis-filter-bar.tsx`
- `analysis-category-filter.tsx`
- `analysis-summary-cards.tsx`
- `income-expense-trend-chart.tsx`
- `category-breakdown-chart.tsx`
- `category-stacked-trend-chart.tsx`
- `category-trend-table.tsx`

### Filter Parser

`lib/analysis/filters.ts`

Responsibilities:

- Parse date presets, custom dates, account ID, category include IDs, and grouping.
- Resolve presets to concrete `from` and `to` ISO dates.
- Resolve Adaptive grouping to Daily, Weekly, or Monthly.
- Detect reversed date ranges.
- Ignore unknown enum values and malformed IDs.

### Analytics Module

`lib/analytics/transaction-analysis.ts`

Responsibilities:

- Build parameterized SQL for the selected date range, account, category include IDs, and grouping.
- Return selected-range totals.
- Return income vs expense trend buckets.
- Return full-range category breakdowns.
- Return top-10-plus-Other stacked trend datasets for income and expenses.
- Return category trend table rows.

The module should reuse existing query helpers from `lib/db/index.ts`.

## UI Layout

The page uses the existing dashboard visual language: quiet, utilitarian, and optimized for scanning.

Top-to-bottom layout:

1. Header with title `Analysis` and a short description.
2. Filter card with date preset, custom dates, account, grouping, and reset action.
3. Category inclusion panel with income and expense category trees.
4. Summary row with Income and Expenses cards.
5. Main trend section with the income vs expenses grouped bar chart.
6. Composition trend section with expense and income stacked bar charts.
7. Breakdown section with expense and income horizontal bar charts.
8. Table section with category trend rows and period columns.

Responsive behavior:

- Desktop uses two-column grids for paired charts.
- Mobile stacks filters, category controls, charts, and table vertically.
- Charts use stable heights in responsive containers.
- Long category labels are truncated in charts when needed, with exact paths available in the table.

## Empty And Invalid States

- No matching transactions: each chart and table area shows an empty state.
- No selected expense categories: expense charts show an empty state.
- No selected income categories: income charts show an empty state.
- Reversed custom date range: page shows an invalid date range state and does not query misleading analysis data.
- Database or query errors fall through to the existing dashboard error boundary.

## Internationalization

Add English and Portuguese strings for:

- Navigation label: Analysis
- Page title and description
- Filter labels and presets
- Grouping options
- Chart titles
- Summary labels
- Empty and invalid states
- Table headers
- `Other` and `Uncategorized`

## Testing Strategy

### Unit Tests

- Filter parsing:
  - Default Last 3 months
  - Each preset
  - Custom date success and fallback
  - Reversed date detection
  - Grouping options and Adaptive resolution
  - Account/category ID parsing
- Analytics shaping:
  - Totals respect date, account, and category filters
  - Trend grouping produces daily, weekly, and monthly buckets
  - Breakdown percentages are based on included totals
  - Stacked charts keep top 10 categories and group the rest as `Other`
- Category tree behavior:
  - Parent toggles descendants
  - Child overrides produce mixed parent state
  - Uncategorized toggles are independent

### E2E Tests

- Authenticated user can navigate to `/analysis`.
- Default Last 3 months view renders without errors.
- Date preset changes update the URL and charts remain visible.
- Account filter changes update the URL and charts remain visible.
- Grouping changes update the URL and charts remain visible.
- Category toggles update the URL and filtered sections render without crashing.

## Acceptance Criteria

- `/analysis` exists and is reachable from dashboard navigation.
- The page defaults to Last 3 months, all accounts, all categories, and Adaptive grouping.
- Users can filter by date range, account, grouping, and included categories.
- Expense and income breakdowns are shown for the selected range.
- Income vs expenses trend is grouped by the selected or resolved time window.
- Expense and income stacked trend charts show top 10 categories plus `Other`.
- Category trend table shows totals and period columns.
- Invalid filters are handled gracefully.
- The implementation includes unit and E2E coverage for the new behavior.
