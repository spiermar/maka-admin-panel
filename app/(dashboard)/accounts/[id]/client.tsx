'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { OfxImportDialog } from '@/components/ofx-import-dialog';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { ImportResult } from '@/lib/actions/ofx-import';

interface AccountDetailClientProps {
  account: Account;
  balance: string;
  transactions: TransactionWithDetails[];
  accounts: Account[];
  categories: CategoryWithPath[];
}

export function AccountDetailClient({
  account,
  balance,
  transactions,
  accounts,
  categories,
}: AccountDetailClientProps) {
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'en';
  const t = useTranslations('accounts');
  const tTransactions = useTranslations('transactions');

  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const formatCurrency = useMemo(() => {
    return (amount: string) => {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: lang === 'pt-BR' ? 'BRL' : 'USD',
      }).format(parseFloat(amount));
    };
  }, [lang]);

  const handleImportComplete = (result: ImportResult) => {
    console.log(`Imported ${result.imported}, skipped ${result.skipped}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{account.name}</h2>
          <p className="text-muted-foreground">
            {t('accountDetails')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            {tTransactions('importOfx')}
          </Button>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setFormOpen(true);
            }}
          >
            {tTransactions('addTransaction')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('balance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${
              parseFloat(balance) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(balance)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tTransactions('title')}</CardTitle>
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
        defaultAccountId={account.id}
        lang={lang}
      />

      <OfxImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accountId={account.id}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
