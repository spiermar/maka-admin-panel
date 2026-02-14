'use client';

import { useState } from 'react';
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
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithDetails | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleImportComplete = (result: ImportResult) => {
    console.log(`Imported ${result.imported}, skipped ${result.skipped}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{account.name}</h2>
          <p className="text-muted-foreground">
            Account details and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            Import OFX
          </Button>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setFormOpen(true);
            }}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-3xl font-bold ${
              parseFloat(balance) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            ${parseFloat(balance).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
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
