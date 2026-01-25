'use client';

import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Account, CategoryWithPath, TransactionWithDetails } from '@/lib/db/types';
import { createTransaction, updateTransaction } from '@/lib/actions/transactions';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: CategoryWithPath[];
  transaction?: TransactionWithDetails | null;
  defaultAccountId?: number;
}

export function TransactionForm({
  open,
  onClose,
  accounts,
  categories,
  transaction,
  defaultAccountId,
}: TransactionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
    }
  }, [open]);

  const handleSubmit = async (formData: FormData) => {
    if (transaction) {
      await updateTransaction(transaction.id, formData);
    } else {
      await createTransaction(formData);
    }
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </SheetTitle>
          <SheetDescription>
            {transaction
              ? 'Update transaction details'
              : 'Enter transaction details'}
          </SheetDescription>
        </SheetHeader>

        <form ref={formRef} action={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="account_id">Account</Label>
            <Select
              name="account_id"
              defaultValue={
                transaction?.account_id.toString() ||
                defaultAccountId?.toString()
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transaction?.date || today}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">Payee</Label>
            <Input
              id="payee"
              name="payee"
              type="text"
              defaultValue={transaction?.payee}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">Category</Label>
            <Select
              name="category_id"
              defaultValue={transaction?.category_id?.toString() || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={transaction?.amount}
              placeholder="Use negative for expenses"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              name="comment"
              defaultValue={transaction?.comment || ''}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {transaction ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
