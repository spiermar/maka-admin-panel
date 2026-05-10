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
import {
  Account,
  CategoryWithPath,
  TransactionWithDetails,
} from '@/lib/db/types';
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
          onOpenChange={setImportOpen}
          accountId={selectedImportAccountId}
          onImportComplete={handleImportComplete}
        />
      ) : null}
    </div>
  );
}
