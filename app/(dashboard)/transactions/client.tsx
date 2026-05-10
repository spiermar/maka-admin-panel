'use client';

import { useMemo, useRef, useState } from 'react';
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
import {
  Account,
  CategoryWithPath,
  TransactionWithDetails,
} from '@/lib/db/types';
import { TransactionFilters } from '@/lib/transactions/filters';

interface TransactionsClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  transactions: TransactionWithDetails[];
  filters: TransactionFilters;
  lang: string;
}

interface FilterDraft {
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
  q: string;
}

type FilterDraftKey = keyof FilterDraft;

function createFilterDraft(filters: TransactionFilters): FilterDraft {
  return {
    accountId: filters.accountId?.toString() || '',
    categoryId: filters.categoryId?.toString() || '',
    from: filters.from || '',
    to: filters.to || '',
    q: filters.q || '',
  };
}

function applyFilterParam(
  params: URLSearchParams,
  key: FilterDraftKey,
  value: string
) {
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
}

export function TransactionsClient({
  accounts,
  categories,
  transactions,
  filters,
  lang,
}: TransactionsClientProps) {
  const t = useTranslations('transactions');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importAccountId, setImportAccountId] = useState<string>('');
  const filterControlsKey = [
    filters.accountId ?? 'all',
    filters.categoryId ?? 'all',
    filters.from ?? '',
    filters.to ?? '',
    filters.q ?? '',
  ].join('|');

  const selectedImportAccountId = useMemo(() => {
    const parsed = Number.parseInt(
      filters.accountId?.toString() || importAccountId,
      10
    );
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [filters.accountId, importAccountId]);

  const closeImportFlow = () => {
    setImportOpen(false);
    setImportAccountId('');
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

      <TransactionsFilterControls
        key={filterControlsKey}
        accounts={accounts}
        categories={categories}
        filters={filters}
        lang={lang}
      />

      {importOpen && !selectedImportAccountId ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('selectImportAccount')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 md:flex-row">
            <Select
              value={importAccountId || 'none'}
              onValueChange={(value) =>
                setImportAccountId(value === 'none' ? '' : value)
              }
            >
              <SelectTrigger
                aria-label={t('selectImportAccount')}
                className="md:max-w-sm"
              >
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
            <Button variant="outline" onClick={closeImportFlow}>
              {t('cancelImport')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div className="font-semibold leading-none tracking-tight">{t('title')}</div>
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
          onOpenChange={(open) => {
            if (open) {
              setImportOpen(true);
            } else {
              closeImportFlow();
            }
          }}
          accountId={selectedImportAccountId}
          onImportComplete={() => {}}
        />
      ) : null}
    </div>
  );
}

interface TransactionsFilterControlsProps {
  accounts: Account[];
  categories: CategoryWithPath[];
  filters: TransactionFilters;
  lang: string;
}

function TransactionsFilterControls({
  accounts,
  categories,
  filters,
  lang,
}: TransactionsFilterControlsProps) {
  const t = useTranslations('transactions');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftFilters, setDraftFilters] = useState(() =>
    createFilterDraft(filters)
  );
  const draftFiltersRef = useRef(draftFilters);

  const updateDraft = (key: FilterDraftKey, value: string) => {
    const nextDraft = {
      ...draftFiltersRef.current,
      [key]: value,
    };
    draftFiltersRef.current = nextDraft;
    setDraftFilters(nextDraft);
    return nextDraft;
  };

  const pushFilters = (draft: FilterDraft) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.get('lang')) {
      params.set('lang', lang);
    }
    applyFilterParam(params, 'accountId', draft.accountId);
    applyFilterParam(params, 'from', draft.from);
    applyFilterParam(params, 'to', draft.to);
    applyFilterParam(params, 'categoryId', draft.categoryId);
    applyFilterParam(params, 'q', draft.q);
    router.push(`${pathname}?${params.toString()}`);
  };

  const updateFilter = (key: FilterDraftKey, value: string) => {
    pushFilters(updateDraft(key, value));
  };

  const clearFilters = () => {
    const emptyDraft = createFilterDraft({});
    draftFiltersRef.current = emptyDraft;
    setDraftFilters(emptyDraft);
    const params = new URLSearchParams();
    params.set('lang', lang);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('filters')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="account-filter">{t('account')}</Label>
            <Select
              value={draftFilters.accountId || 'all'}
              onValueChange={(value) =>
                updateFilter('accountId', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger id="account-filter" aria-label={t('account')}>
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
              value={draftFilters.from}
              onChange={(event) => updateDraft('from', event.currentTarget.value)}
              onBlur={(event) => updateFilter('from', event.currentTarget.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">{t('to')}</Label>
            <Input
              id="to"
              type="date"
              value={draftFilters.to}
              onChange={(event) => updateDraft('to', event.currentTarget.value)}
              onBlur={(event) => updateFilter('to', event.currentTarget.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-filter">{t('category')}</Label>
            <Select
              value={draftFilters.categoryId || 'all'}
              onValueChange={(value) =>
                updateFilter('categoryId', value === 'all' ? '' : value)
              }
            >
              <SelectTrigger id="category-filter" aria-label={t('category')}>
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
                value={draftFilters.q}
                placeholder={t('searchPlaceholder')}
                onChange={(event) => updateDraft('q', event.currentTarget.value)}
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
  );
}
