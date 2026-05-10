# Global Transaction View Design

## Context

The application currently shows transactions only from an account detail route at `/accounts/[id]`. That makes account the route boundary, even though users need a global transaction ledger where account is one filter among several.

The new design creates one canonical transaction view at `/transactions`. Account-specific links and legacy account-detail URLs will land on that view with the account filter already applied.

## Goals

- Add a protected global transaction page at `/transactions`.
- Support URL-backed filters for account, date range, category, and payee/comment search.
- Preserve existing transaction actions: add, edit, delete, and OFX import.
- Redirect `/accounts/[id]` to the global page with the account filter applied.
- Keep filtered transaction URLs shareable, refresh-safe, and compatible with browser back/forward navigation.

## Non-Goals

- No amount range filter in the first version.
- No income/expense type filter in the first version.
- No client-side API fetching or live table updates beyond existing form/action behavior.
- No redesign of account management or dashboard analytics.

## Route And UX

Add a protected dashboard route at `/transactions`. By default it shows recent transactions across all accounts, sorted by transaction date descending and creation time descending.

The page includes:

- Header: `Transactions`, brief supporting copy, `Import OFX`, and `Add Transaction`.
- Filter bar: account, from date, to date, category, search, and clear filters.
- Transaction table: date, account, payee, category, amount, comment, and actions.
- Existing transaction actions: OFX details, edit, and delete.

Filter state lives in the URL:

- `accountId`: account id.
- `from`: inclusive lower date bound.
- `to`: inclusive upper date bound.
- `categoryId`: category id.
- `q`: payee/comment search text.
- `lang`: existing locale parameter, preserved when present.

Changing a filter updates the URL. The server page reads the new URL, fetches matching rows, and renders the updated table.

Account-specific entry points become shortcuts into the global page:

- Account cards link to `/transactions?accountId=<id>&lang=<locale>`.
- Dashboard recent-transaction account links point to the same filtered URL.
- `/accounts/[id]` validates that the account exists, then redirects to `/transactions?accountId=<id>`, preserving `lang` when present.
- Invalid `/accounts/[id]` values continue to return 404.

## Transaction Actions

The page keeps the current add, edit, delete, and OFX import flows.

`Add Transaction` opens the existing transaction form. The form still includes an account selector. If the current URL has a valid `accountId`, that account is the default selection.

`Edit` opens the existing transaction form populated from the selected row.

`Delete` keeps the existing confirmation and server action behavior.

`Import OFX` opens the existing import dialog. If the current URL has a valid `accountId`, the dialog uses that account. If no account filter is active, the page requires the user to choose an account before importing.

## Data Flow

Add a reusable query helper in `lib/db/transactions.ts`, conceptually:

```ts
type TransactionFilters = {
  accountId?: number;
  from?: string;
  to?: string;
  categoryId?: number;
  q?: string;
};

getTransactions(filters: TransactionFilters, options?: { limit?: number; offset?: number })
```

The helper reuses the existing transaction detail projection:

- `transactions` as the base table.
- Join `accounts` for `account_name`.
- Left join `categories`.
- Recursive category hierarchy CTE for `category_path`.

It builds a parameterized `WHERE` clause:

- `t.account_id = $n` when `accountId` is present.
- `t.date >= $n` when `from` is present.
- `t.date <= $n` when `to` is present.
- `t.category_id = $n` when `categoryId` is present.
- `(t.payee ILIKE $n OR t.comment ILIKE $n)` when `q` is present.

The default limit remains 100 and default offset remains 0, matching the existing account-specific query behavior.

`app/(dashboard)/transactions/page.tsx` parses and sanitizes `searchParams`, loads accounts, categories, and filtered transactions, then passes them to `app/(dashboard)/transactions/client.tsx`.

The client component owns filter controls, form/dialog open state, and URL updates. It reuses existing transaction components where possible.

## Component Changes

Add:

- `app/(dashboard)/transactions/page.tsx`: server component for parsing filters and fetching data.
- `app/(dashboard)/transactions/client.tsx`: client component for filters, table, and dialogs.

Update:

- `lib/db/transactions.ts`: add the global filtered query helper.
- `components/transactions/transaction-table.tsx`: include the account column as part of the primary transaction table because the account-scoped page redirects away.
- `app/(dashboard)/accounts/[id]/page.tsx`: replace the current detail rendering with account validation and redirect.
- `app/(dashboard)/accounts/[id]/client.tsx`: remove if no longer used after redirect.
- `app/(dashboard)/accounts/page.tsx`: link account cards to the filtered global transactions page.
- `components/dashboard/recent-transactions.tsx`: link account names to the filtered global transactions page.
- `components/dashboard/nav.tsx`: add a top-level Transactions link.
- `lib/actions/transactions.ts` and `lib/actions/ofx-import.ts`: revalidate `/transactions` after transaction mutations/imports.
- `messages/en.json` and `messages/pt-BR.json`: add labels for the Transactions nav item, filters, clear action, global page copy, and account picker for import when needed.

## Edge Cases

- Invalid filter values are ignored instead of crashing, and the URL is allowed to remain as entered until the user changes filters.
- Invalid account ids in `/accounts/[id]` still return 404 before redirect.
- A valid account id with no transactions shows the normal empty transaction state.
- Search trims whitespace. Empty search is treated as no search filter.
- Date filters are inclusive and compare against the `DATE` value stored in `transactions.date`.
- If both `from` and `to` are valid dates and `from` is after `to`, the page shows an empty result set.
- Uncategorized transactions appear when no category filter is selected. Filtering for uncategorized is not part of the first version.

## Testing

Add or update unit tests for:

- `getTransactions` with no filters.
- Account filter.
- Date range filter.
- Category filter.
- Search filter.
- Combined filters and pagination arguments.

Add or update component tests for:

- Global transaction table rendering with the account column.
- Empty filtered results.
- Filter controls reflecting URL-provided initial state.

Add or update E2E coverage for:

- Navigating from an account card to `/transactions?accountId=<id>`.
- The account filter appearing selected after that navigation.
- `/accounts/[id]` redirecting to the filtered global transaction view.
- Add/edit/delete actions remaining available on the global view.
- Unauthenticated access to `/transactions` redirecting through the dashboard auth layout.

Run local verification before implementation completion:

```bash
npm run lint
npm test -- --run
npm run test:e2e
```
