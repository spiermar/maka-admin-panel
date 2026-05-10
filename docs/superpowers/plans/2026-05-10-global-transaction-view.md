# Global Transaction View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a canonical `/transactions` page with URL-backed account, date, category, and search filters, while redirecting existing account transaction URLs into that global view.

**Architecture:** Use a server-filtered Next.js App Router page. A small filter helper sanitizes URL params, `lib/db/transactions.ts` owns the parameterized SQL query, and a client component owns filter controls plus existing transaction dialogs. Existing account-detail entry points become links or redirects to `/transactions?accountId=<id>`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, next-intl, Vitest, Playwright, PostgreSQL via existing `queryMany` helpers.

---

## File Structure

- Create `lib/transactions/filters.ts`: parse and sanitize transaction filter query params.
- Create `__tests__/lib/transactions/filters.test.ts`: unit tests for URL filter parsing.
- Modify `lib/db/transactions.ts`: add `TransactionFilters` type and `getTransactions` query helper.
- Modify `__tests__/lib/db/transactions.test.ts`: cover global filtered query behavior.
- Modify `components/transactions/transaction-table.tsx`: include account column in the primary transaction table.
- Modify `__tests__/components/transactions/transaction-table.test.tsx`: assert the account column renders.
- Create `app/(dashboard)/transactions/page.tsx`: server page that parses filters and fetches accounts, categories, and transactions.
- Create `app/(dashboard)/transactions/client.tsx`: client page for filters, URL updates, add/edit/delete, and OFX import account selection.
- Create `__tests__/app/transactions-client.test.tsx`: component test for initial filter state on the global page.
- Modify `app/(dashboard)/accounts/[id]/page.tsx`: validate account and redirect to `/transactions?accountId=<id>`.
- Remove `app/(dashboard)/accounts/[id]/client.tsx` after redirect makes it unused.
- Modify `app/(dashboard)/accounts/page.tsx`: point account cards to filtered global transactions.
- Modify `components/dashboard/recent-transactions.tsx`: point account links to filtered global transactions.
- Modify `components/dashboard/nav.tsx`: add Transactions nav item.
- Modify `lib/actions/transactions.ts` and `lib/actions/ofx-import.ts`: revalidate `/transactions`.
- Modify `messages/en.json` and `messages/pt-BR.json`: add nav and transaction filter labels.
- Add or modify E2E coverage in `e2e/03-navigation.spec.ts` and `e2e/08-accounts-list.spec.ts`.

---

### Task 1: URL Filter Parser

**Files:**
- Create: `lib/transactions/filters.ts`
- Create: `__tests__/lib/transactions/filters.test.ts`

- [ ] **Step 1: Write failing parser tests**

Create `__tests__/lib/transactions/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseTransactionFilters } from '@/lib/transactions/filters';

describe('parseTransactionFilters', () => {
  it('parses valid transaction filter query params', () => {
    const result = parseTransactionFilters({
      accountId: '2',
      categoryId: '7',
      from: '2026-05-01',
      to: '2026-05-31',
      q: ' rent ',
      lang: 'pt-BR',
    });

    expect(result).toEqual({
      filters: {
        accountId: 2,
        categoryId: 7,
        from: '2026-05-01',
        to: '2026-05-31',
        q: 'rent',
      },
      lang: 'pt-BR',
      hasInvalidDateRange: false,
    });
  });

  it('ignores invalid numeric and date values', () => {
    const result = parseTransactionFilters({
      accountId: 'abc',
      categoryId: '-1',
      from: '05/01/2026',
      to: 'not-a-date',
      q: '   ',
      lang: 'fr',
    });

    expect(result).toEqual({
      filters: {},
      lang: 'en',
      hasInvalidDateRange: false,
    });
  });

  it('marks valid reversed date ranges for empty result rendering', () => {
    const result = parseTransactionFilters({
      from: '2026-05-31',
      to: '2026-05-01',
    });

    expect(result).toEqual({
      filters: {
        from: '2026-05-31',
        to: '2026-05-01',
      },
      lang: 'en',
      hasInvalidDateRange: true,
    });
  });

  it('uses the first string when Next passes an array query value', () => {
    const result = parseTransactionFilters({
      accountId: ['4', '5'],
      q: ['office', 'ignored'],
    });

    expect(result.filters).toEqual({
      accountId: 4,
      q: 'office',
    });
  });
});
```

- [ ] **Step 2: Run parser tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/lib/transactions/filters.test.ts
```

Expected: FAIL because `@/lib/transactions/filters` does not exist.

- [ ] **Step 3: Implement the parser**

Create `lib/transactions/filters.ts`:

```ts
import { defaultLocale, locales, type Locale } from '@/lib/i18n/config';

export interface TransactionFilters {
  accountId?: number;
  categoryId?: number;
  from?: string;
  to?: string;
  q?: string;
}

export interface ParsedTransactionFilters {
  filters: TransactionFilters;
  lang: Locale;
  hasInvalidDateRange: boolean;
}

type QueryValue = string | string[] | undefined;
export type TransactionFilterSearchParams = Record<string, QueryValue>;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value: QueryValue): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parsePositiveInteger(value: QueryValue): number | undefined {
  const raw = firstValue(value);
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseIsoDate(value: QueryValue): string | undefined {
  const raw = firstValue(value);
  if (!raw || !ISO_DATE_RE.test(raw)) {
    return undefined;
  }

  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : raw;
}

function parseSearch(value: QueryValue): string | undefined {
  const raw = firstValue(value)?.trim();
  return raw ? raw : undefined;
}

function parseLocale(value: QueryValue): Locale {
  const raw = firstValue(value);
  return raw && locales.includes(raw as Locale) ? (raw as Locale) : defaultLocale;
}

export function parseTransactionFilters(
  searchParams: TransactionFilterSearchParams
): ParsedTransactionFilters {
  const filters: TransactionFilters = {};
  const accountId = parsePositiveInteger(searchParams.accountId);
  const categoryId = parsePositiveInteger(searchParams.categoryId);
  const from = parseIsoDate(searchParams.from);
  const to = parseIsoDate(searchParams.to);
  const q = parseSearch(searchParams.q);

  if (accountId) {
    filters.accountId = accountId;
  }
  if (categoryId) {
    filters.categoryId = categoryId;
  }
  if (from) {
    filters.from = from;
  }
  if (to) {
    filters.to = to;
  }
  if (q) {
    filters.q = q;
  }

  return {
    filters,
    lang: parseLocale(searchParams.lang),
    hasInvalidDateRange: !!from && !!to && from > to,
  };
}
```

- [ ] **Step 4: Run parser tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/lib/transactions/filters.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit parser work**

Run:

```bash
git add lib/transactions/filters.ts __tests__/lib/transactions/filters.test.ts
git commit -m "feat: parse transaction filter query params"
```

---

### Task 2: Filtered Transaction Query

**Files:**
- Modify: `lib/db/transactions.ts`
- Modify: `__tests__/lib/db/transactions.test.ts`

- [ ] **Step 1: Write failing query tests**

Update the import in `__tests__/lib/db/transactions.test.ts`:

```ts
import {
  getTransactionById,
  getTransactionsByAccount,
  getRecentTransactions,
  getTransactions,
} from '@/lib/db/transactions';
```

Add this `describe` block before `describe('getRecentTransactions', () => {`:

```ts
  describe('getTransactions', () => {
    it('returns global transactions with default pagination', async () => {
      const { queryMany } = await import('@/lib/db');
      const transactions = [mockTransactionWithDetails];
      vi.mocked(queryMany).mockResolvedValue(transactions);

      const result = await getTransactions({});

      expect(result).toEqual(transactions);
      expect(queryMany).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions t'),
        [100, 0]
      );
      expect(vi.mocked(queryMany).mock.calls[0][0]).not.toContain('WHERE t.');
    });

    it('filters by account, date range, category, and search', async () => {
      const { queryMany } = await import('@/lib/db');
      vi.mocked(queryMany).mockResolvedValue([]);

      await getTransactions(
        {
          accountId: 2,
          from: '2026-05-01',
          to: '2026-05-31',
          categoryId: 7,
          q: 'rent',
        },
        { limit: 25, offset: 50 }
      );

      const [sql, params] = vi.mocked(queryMany).mock.calls[0];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('t.account_id = $1');
      expect(sql).toContain('t.date >= $2');
      expect(sql).toContain('t.date <= $3');
      expect(sql).toContain('t.category_id = $4');
      expect(sql).toContain("(t.payee ILIKE $5 ESCAPE '\\\\' OR t.comment ILIKE $5 ESCAPE '\\\\')");
      expect(sql).toContain('ORDER BY t.date DESC, t.created_at DESC');
      expect(sql).toContain('LIMIT $6 OFFSET $7');
      expect(params).toEqual([2, '2026-05-01', '2026-05-31', 7, '%rent%', 25, 50]);
    });

    it('escapes wildcard characters in search terms', async () => {
      const { queryMany } = await import('@/lib/db');
      vi.mocked(queryMany).mockResolvedValue([]);

      await getTransactions({ q: '100%_match' });

      const [sql, params] = vi.mocked(queryMany).mock.calls[0];
      expect(sql).toContain("ESCAPE '\\\\'");
      expect(params).toEqual(['%100\\%\\_match%', 100, 0]);
    });
  });
```

- [ ] **Step 2: Run query tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/lib/db/transactions.test.ts
```

Expected: FAIL because `getTransactions` is not exported.

- [ ] **Step 3: Implement the query helper**

In `lib/db/transactions.ts`, add the import and helper before `getTransactionsByAccount`:

```ts
import { TransactionFilters } from '@/lib/transactions/filters';
```

```ts
function escapeLikeSearch(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function buildTransactionWhereClause(filters: TransactionFilters): {
  whereSql: string;
  params: Array<number | string>;
} {
  const clauses: string[] = [];
  const params: Array<number | string> = [];

  if (filters.accountId) {
    params.push(filters.accountId);
    clauses.push(`t.account_id = $${params.length}`);
  }

  if (filters.from) {
    params.push(filters.from);
    clauses.push(`t.date >= $${params.length}`);
  }

  if (filters.to) {
    params.push(filters.to);
    clauses.push(`t.date <= $${params.length}`);
  }

  if (filters.categoryId) {
    params.push(filters.categoryId);
    clauses.push(`t.category_id = $${params.length}`);
  }

  if (filters.q) {
    params.push(`%${escapeLikeSearch(filters.q)}%`);
    clauses.push(
      `(t.payee ILIKE $${params.length} ESCAPE '\\' OR t.comment ILIKE $${params.length} ESCAPE '\\')`
    );
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

export async function getTransactions(
  filters: TransactionFilters,
  options?: { limit?: number; offset?: number }
): Promise<TransactionWithDetails[]> {
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;
  const { whereSql, params } = buildTransactionWhereClause(filters);
  const limitParam = params.length + 1;
  const offsetParam = params.length + 2;

  return queryMany<TransactionWithDetails>(
    `WITH RECURSIVE category_hierarchy AS (
       SELECT id, name, parent_id, name::varchar as full_path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       SELECT c.id, c.name, c.parent_id,
              ch.full_path || ' > ' || c.name
       FROM categories c
       INNER JOIN category_hierarchy ch ON c.parent_id = ch.id
     )
     SELECT
       t.*,
       a.name as account_name,
       c.name as category_name,
       COALESCE(ch.full_path, 'Uncategorized') as category_path
     FROM transactions t
     INNER JOIN accounts a ON t.account_id = a.id
     LEFT JOIN categories c ON t.category_id = c.id
     LEFT JOIN category_hierarchy ch ON t.category_id = ch.id
     ${whereSql}
     ORDER BY t.date DESC, t.created_at DESC
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    [...params, limit, offset]
  );
}
```

- [ ] **Step 4: Run query tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/lib/db/transactions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit query work**

Run:

```bash
git add lib/db/transactions.ts __tests__/lib/db/transactions.test.ts
git commit -m "feat: query filtered transactions"
```

---

### Task 3: Transaction Table Account Column

**Files:**
- Modify: `components/transactions/transaction-table.tsx`
- Modify: `__tests__/components/transactions/transaction-table.test.tsx`

- [ ] **Step 1: Write failing table test**

Add this test to `__tests__/components/transactions/transaction-table.test.tsx`:

```ts
  it('renders the account column for global transaction views', () => {
    renderWithI18n(
      <TransactionTable
        transactions={mockTransactions}
        onEdit={mockOnEdit}
      />
    );

    expect(screen.getByRole('columnheader', { name: 'Account' })).toBeInTheDocument();
    expect(screen.getByText('Test Account')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run table tests and verify they fail**

Run:

```bash
npm test -- --run __tests__/components/transactions/transaction-table.test.tsx
```

Expected: FAIL because the Account column is not rendered.

- [ ] **Step 3: Add the account column**

In `components/transactions/transaction-table.tsx`, update the table header, empty state colspan, and row cells:

```tsx
<TableHeader>
   <TableRow>
     <TableHead>{t('date')}</TableHead>
     <TableHead>{t('account')}</TableHead>
     <TableHead>{t('payee')}</TableHead>
     <TableHead>{t('category')}</TableHead>
     <TableHead className="text-right">{t('amount')}</TableHead>
     <TableHead>{t('comment')}</TableHead>
     <TableHead className="text-right">{t('actions')}</TableHead>
   </TableRow>
</TableHeader>
```

```tsx
<TableCell
  colSpan={7}
  className="text-center text-muted-foreground"
>
  {t('noTransactions')}
</TableCell>
```

```tsx
<TableCell>
  {formatDate(transaction.date)}
</TableCell>
<TableCell>{transaction.account_name}</TableCell>
<TableCell>{transaction.payee}</TableCell>
```

- [ ] **Step 4: Add translation key used by the table**

In `messages/en.json`, inside `"transactions"`, add:

```json
"account": "Account",
```

In `messages/pt-BR.json`, inside `"transactions"`, add:

```json
"account": "Conta",
```

- [ ] **Step 5: Run table tests and verify they pass**

Run:

```bash
npm test -- --run __tests__/components/transactions/transaction-table.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit table work**

Run:

```bash
git add components/transactions/transaction-table.tsx __tests__/components/transactions/transaction-table.test.tsx messages/en.json messages/pt-BR.json
git commit -m "feat: show account in transaction table"
```

---

### Task 4: Global Transactions Page

**Files:**
- Create: `app/(dashboard)/transactions/page.tsx`
- Create: `app/(dashboard)/transactions/client.tsx`
- Create: `__tests__/app/transactions-client.test.tsx`
- Modify: `messages/en.json`
- Modify: `messages/pt-BR.json`

- [ ] **Step 1: Create the server page**

Create `app/(dashboard)/transactions/page.tsx`:

```tsx
import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { getTransactions } from '@/lib/db/transactions';
import { parseTransactionFilters, TransactionFilterSearchParams } from '@/lib/transactions/filters';
import { TransactionsClient } from './client';

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionFilterSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const parsed = parseTransactionFilters(resolvedSearchParams);

  const [accounts, categories] = await Promise.all([
    getAllAccounts(),
    getAllCategoriesWithPaths(),
  ]);

  const validAccountIds = new Set(accounts.map((account) => account.id));
  const validCategoryIds = new Set(categories.map((category) => category.id));
  const filters = {
    ...parsed.filters,
    accountId:
      parsed.filters.accountId && validAccountIds.has(parsed.filters.accountId)
        ? parsed.filters.accountId
        : undefined,
    categoryId:
      parsed.filters.categoryId && validCategoryIds.has(parsed.filters.categoryId)
        ? parsed.filters.categoryId
        : undefined,
  };

  const transactions = parsed.hasInvalidDateRange ? [] : await getTransactions(filters);

  return (
    <TransactionsClient
      accounts={accounts}
      categories={categories}
      transactions={transactions}
      filters={filters}
      lang={parsed.lang}
    />
  );
}
```

- [ ] **Step 2: Create the client page**

Create `app/(dashboard)/transactions/client.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OfxImportDialog } from '@/components/ofx-import-dialog';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { TransactionFilters } from '@/lib/transactions/filters';
import { ImportResult } from '@/lib/actions/ofx-import';

interface TransactionsClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  transactions: TransactionWithDetails[];
  filters: TransactionFilters;
  lang: string;
}

export function TransactionsClient({
  accounts,
  categories,
  transactions,
  filters,
  lang,
}: TransactionsClientProps) {
  const t = useTranslations('transactions');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importAccountId, setImportAccountId] = useState<string>(
    filters.accountId?.toString() || ''
  );

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    if (!params.get('lang')) {
      params.set('lang', lang);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    params.set('lang', lang);
    router.push(`${pathname}?${params.toString()}`);
  };

  const selectedImportAccountId = useMemo(() => {
    const parsed = Number.parseInt(importAccountId, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [importAccountId]);

  const handleImportComplete = (_result: ImportResult) => {
    setImportOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('globalDescription')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            {t('importOfx')}
          </Button>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setFormOpen(true);
            }}
          >
            {t('addTransaction')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label>{t('account')}</Label>
              <Select
                value={filters.accountId?.toString() || 'all'}
                onValueChange={(value) =>
                  updateFilter('accountId', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('allAccounts')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allAccounts')}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="from">{t('from')}</Label>
              <Input
                id="from"
                type="date"
                defaultValue={filters.from || ''}
                onBlur={(event) => updateFilter('from', event.currentTarget.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="to">{t('to')}</Label>
              <Input
                id="to"
                type="date"
                defaultValue={filters.to || ''}
                onBlur={(event) => updateFilter('to', event.currentTarget.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('category')}</Label>
              <Select
                value={filters.categoryId?.toString() || 'all'}
                onValueChange={(value) =>
                  updateFilter('categoryId', value === 'all' ? '' : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allCategories')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="q">{t('search')}</Label>
              <div className="flex gap-2">
                <Input
                  id="q"
                  defaultValue={filters.q || ''}
                  placeholder={t('searchPlaceholder')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      updateFilter('q', event.currentTarget.value);
                    }
                  }}
                  onBlur={(event) => updateFilter('q', event.currentTarget.value)}
                />
                <Button type="button" variant="outline" onClick={clearFilters}>
                  {t('clearFilters')}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {importOpen && !selectedImportAccountId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('selectImportAccount')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row">
            <Select value={importAccountId || 'none'} onValueChange={setImportAccountId}>
              <SelectTrigger className="md:max-w-sm">
                <SelectValue placeholder={t('selectAccountPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('selectAccountPlaceholder')}</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              {t('cancelImport')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            lang={lang}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setFormOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <TransactionForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingTransaction(null);
        }}
        accounts={accounts}
        categories={categories}
        transaction={editingTransaction}
        defaultAccountId={filters.accountId}
      />

      {selectedImportAccountId ? (
        <OfxImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          accountId={selectedImportAccountId}
          onImportComplete={handleImportComplete}
        />
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Write client component test for initial filter state**

Create `__tests__/app/transactions-client.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { TransactionsClient } from '@/app/(dashboard)/transactions/client';
import enMessages from '@/messages/en.json';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';

vi.mock('@/components/ofx-import-dialog', () => ({
  OfxImportDialog: () => <div data-testid="ofx-import-dialog" />,
}));

vi.mock('@/components/transactions/transaction-form', () => ({
  TransactionForm: () => <div data-testid="transaction-form" />,
}));

vi.mock('@/components/transactions/transaction-table', () => ({
  TransactionTable: ({ transactions }: { transactions: TransactionWithDetails[] }) => (
    <div data-testid="transaction-table">
      {transactions.map((transaction) => (
        <span key={transaction.id}>
          {transaction.account_name} {transaction.category_path}
        </span>
      ))}
    </div>
  ),
}));

describe('TransactionsClient', () => {
  const accounts: Account[] = [
    { id: 1, name: 'Checking Account', created_at: new Date('2026-01-01') },
    { id: 2, name: 'Savings Account', created_at: new Date('2026-01-01') },
  ];

  const categories: CategoryWithPath[] = [
    {
      id: 7,
      name: 'Rent',
      parent_id: null,
      category_type: 'expense',
      depth: 1,
      created_at: new Date('2026-01-01'),
      path: 'Rent',
    },
  ];

  const transactions: TransactionWithDetails[] = [
    {
      id: 1,
      account_id: 1,
      date: '2026-05-01',
      payee: 'Property Manager',
      category_id: 7,
      amount: '-1200.00',
      comment: 'May rent',
      created_at: new Date('2026-05-01'),
      updated_at: new Date('2026-05-01'),
      ofx_fitid: null,
      ofx_memo: null,
      ofx_refnum: null,
      account_name: 'Checking Account',
      category_name: 'Rent',
      category_path: 'Rent',
    },
  ];

  it('renders URL-provided filter values as initial control state', () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <TransactionsClient
          accounts={accounts}
          categories={categories}
          transactions={transactions}
          filters={{
            accountId: 1,
            categoryId: 7,
            from: '2026-05-01',
            to: '2026-05-31',
            q: 'rent',
          }}
          lang="en"
        />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('heading', { name: 'Transactions' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-05-31')).toBeInTheDocument();
    expect(screen.getByDisplayValue('rent')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-table')).toHaveTextContent('Checking Account');
    expect(screen.getByTestId('transaction-table')).toHaveTextContent('Rent');
  });
});
```

- [ ] **Step 4: Add translations**

In `messages/en.json`, inside `"nav"`, add:

```json
"transactions": "Transactions",
```

In `messages/en.json`, inside `"transactions"`, add:

```json
"globalDescription": "Browse, filter, add, import, and maintain transactions across accounts.",
"filters": "Filters",
"allAccounts": "All accounts",
"allCategories": "All categories",
"from": "From",
"to": "To",
"search": "Search",
"searchPlaceholder": "Search payee or comment",
"clearFilters": "Clear",
"selectImportAccount": "Choose an account to import OFX transactions",
"cancelImport": "Cancel import",
```

In `messages/pt-BR.json`, inside `"nav"`, add:

```json
"transactions": "Transações",
```

In `messages/pt-BR.json`, inside `"transactions"`, add:

```json
"globalDescription": "Consulte, filtre, adicione, importe e mantenha transações entre contas.",
"filters": "Filtros",
"allAccounts": "Todas as contas",
"allCategories": "Todas as categorias",
"from": "De",
"to": "Até",
"search": "Busca",
"searchPlaceholder": "Buscar beneficiário ou comentário",
"clearFilters": "Limpar",
"selectImportAccount": "Escolha uma conta para importar transações OFX",
"cancelImport": "Cancelar importação",
```

- [ ] **Step 5: Run client component test and verify it passes**

Run:

```bash
npm test -- --run __tests__/app/transactions-client.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run lint to catch TypeScript and translation key issues**

Run:

```bash
npm run lint
```

Expected: PASS. If this fails because of an unused import or formatting issue, fix exactly that issue and rerun the command.

- [ ] **Step 7: Commit global page work**

Run:

```bash
git add app/\(dashboard\)/transactions/page.tsx app/\(dashboard\)/transactions/client.tsx __tests__/app/transactions-client.test.tsx messages/en.json messages/pt-BR.json
git commit -m "feat: add global transactions page"
```

---

### Task 5: Redirects, Links, Navigation, And Revalidation

**Files:**
- Modify: `app/(dashboard)/accounts/[id]/page.tsx`
- Delete: `app/(dashboard)/accounts/[id]/client.tsx`
- Modify: `app/(dashboard)/accounts/page.tsx`
- Modify: `components/dashboard/recent-transactions.tsx`
- Modify: `components/dashboard/nav.tsx`
- Modify: `lib/actions/transactions.ts`
- Modify: `lib/actions/ofx-import.ts`

- [ ] **Step 1: Replace account detail with redirect**

Replace `app/(dashboard)/accounts/[id]/page.tsx` with:

```tsx
import { notFound, redirect } from 'next/navigation';
import { getAccountById } from '@/lib/db/accounts';

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const accountId = Number.parseInt(resolvedParams.id, 10);

  if (!Number.isInteger(accountId)) {
    notFound();
  }

  const account = await getAccountById(accountId);
  if (!account) {
    notFound();
  }

  const paramsForRedirect = new URLSearchParams({
    accountId: account.id.toString(),
  });

  if (resolvedSearchParams.lang) {
    paramsForRedirect.set('lang', resolvedSearchParams.lang);
  }

  redirect(`/transactions?${paramsForRedirect.toString()}`);
}
```

- [ ] **Step 2: Delete unused account detail client**

Delete `app/(dashboard)/accounts/[id]/client.tsx`.

- [ ] **Step 3: Update account cards**

In `app/(dashboard)/accounts/page.tsx`, change:

```tsx
<Link key={account.id} href={`/accounts/${account.id}?lang=${locale}`}>
```

to:

```tsx
<Link key={account.id} href={`/transactions?accountId=${account.id}&lang=${locale}`}>
```

- [ ] **Step 4: Update recent transaction account links**

In `components/dashboard/recent-transactions.tsx`, change:

```tsx
href={`/accounts/${transaction.account_id}`}
```

to:

```tsx
href={`/transactions?accountId=${transaction.account_id}&lang=${locale}`}
```

- [ ] **Step 5: Add nav link**

In `components/dashboard/nav.tsx`, update `navLinks`:

```ts
const navLinks = [
  { href: `/?lang=${lang}`, label: t('dashboard') },
  { href: `/accounts?lang=${lang}`, label: t('accounts') },
  { href: `/transactions?lang=${lang}`, label: t('transactions') },
];
```

- [ ] **Step 6: Revalidate the global route after transaction mutations**

In `lib/actions/transactions.ts`, add `revalidatePath('/transactions');` after each existing `revalidatePath('/')`.

For `createTransaction`, the block becomes:

```ts
    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath(`/accounts/${account_id}`);
```

For `updateTransaction`, the block becomes:

```ts
    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath(`/accounts/${account_id}`);
```

For `deleteTransaction`, the block becomes:

```ts
    revalidatePath('/');
    revalidatePath('/transactions');
    revalidatePath(`/accounts/${accountId}`);
```

- [ ] **Step 7: Revalidate the global route after OFX import**

In `lib/actions/ofx-import.ts`, add `revalidatePath('/transactions');` next to the existing account revalidation:

```ts
  revalidatePath('/');
  revalidatePath('/transactions');
  revalidatePath(`/accounts/${accountId}`);
```

- [ ] **Step 8: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 9: Commit route integration work**

Run:

```bash
git add app/\(dashboard\)/accounts/\[id\]/page.tsx app/\(dashboard\)/accounts/page.tsx components/dashboard/recent-transactions.tsx components/dashboard/nav.tsx lib/actions/transactions.ts lib/actions/ofx-import.ts
git add -u app/\(dashboard\)/accounts/\[id\]/client.tsx
git commit -m "feat: route account transactions to global view"
```

---

### Task 6: E2E Coverage

**Files:**
- Modify: `e2e/08-accounts-list.spec.ts`
- Modify: `e2e/03-navigation.spec.ts`

- [ ] **Step 1: Update account-card navigation test**

In `e2e/08-accounts-list.spec.ts`, replace the account detail navigation assertions in `should navigate to account detail when clicking account card` with:

```ts
    await expect(page).toHaveURL(/\/transactions\?accountId=\d+/);
    await expect(
      page.getByRole('heading', { name: /transactions/i })
    ).toBeVisible();
    await expect(page.getByText('Checking Account').first()).toBeVisible();
```

Rename the test:

```ts
test('should navigate to filtered transactions when clicking account card', async ({ page }) => {
```

- [ ] **Step 2: Update protected route lists**

In `e2e/03-navigation.spec.ts`, change route arrays that include only account detail to include both the canonical route and compatibility redirect:

```ts
const routes = ['/settings', '/transactions', `/accounts/${accountId}`];
```

and:

```ts
const protectedRoutes = [
  '/',
  '/settings',
  '/transactions',
  `/accounts/${accountId}`,
];
```

- [ ] **Step 3: Add direct redirect E2E test**

In `e2e/03-navigation.spec.ts`, add this test in `test.describe('Navigation and Protected Routes', () => {`:

```ts
  test('should redirect account detail URLs to filtered transactions', async ({ page }) => {
    const accountId = await getAccountIdByName('Checking Account');

    await page.goto(`/accounts/${accountId}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(new RegExp(`/transactions\\?accountId=${accountId}`));
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();
    await expect(page.getByText('Checking Account').first()).toBeVisible();
  });
```

- [ ] **Step 4: Add global page unauthenticated coverage**

In `e2e/03-navigation.spec.ts`, add `/transactions` to the unauthenticated protected route list:

```ts
const protectedRoutes = [
  '/',
  '/settings',
  '/transactions',
  `/accounts/${accountId}`,
];
```

- [ ] **Step 5: Run focused E2E tests**

Run:

```bash
npm run test:e2e -- e2e/03-navigation.spec.ts e2e/08-accounts-list.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit E2E coverage**

Run:

```bash
git add e2e/03-navigation.spec.ts e2e/08-accounts-list.spec.ts
git commit -m "test: cover global transaction navigation"
```

---

### Task 7: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run unit tests**

Run:

```bash
npm test -- --run
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run E2E tests**

Run:

```bash
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Inspect worktree**

Run:

```bash
git status --short --branch
```

Expected: clean feature branch except for intentionally untracked `.superpowers/` brainstorming artifacts if they have not been removed or ignored.

- [ ] **Step 5: Finish verification**

If verification passed with no changes, do not create an empty commit. If verification required a fix, commit the exact changed files from `git status --short` with a conventional message that describes the fix.

---

## Self-Review

Spec coverage:

- Canonical `/transactions` route: Task 4.
- URL-backed account, date, category, and search filters: Tasks 1, 2, and 4.
- Existing add/edit/delete/import actions: Task 4.
- `/accounts/[id]` redirect: Task 5.
- Account cards and recent transaction account links: Task 5.
- Transactions nav item: Task 5.
- Mutation revalidation for `/transactions`: Task 5.
- Unit, component, E2E, lint, and full verification coverage: Tasks 1, 2, 3, 4, 6, and 7.

Placeholder scan: every implementation task names files, commands, and expected results.

Type consistency: `TransactionFilters` is defined in `lib/transactions/filters.ts` and reused by the DB query and client component. URL params use `accountId`, `categoryId`, `from`, `to`, `q`, and `lang` consistently.
