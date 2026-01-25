'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TransactionTable } from '@/components/transactions/transaction-table';
import { TransactionForm } from '@/components/transactions/transaction-form';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{account.name}</h2>
          <p className="text-muted-foreground">
            Account details and transactions
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setFormOpen(true);
          }}
        >
          Add Transaction
        </Button>
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
    </div>
  );
}
