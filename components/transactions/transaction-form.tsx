'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  lang?: string;
}

export function TransactionForm({
  open,
  onClose,
  accounts,
  categories,
  transaction,
  defaultAccountId,
  lang = 'en',
}: TransactionFormProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');

  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      setErrors({});
      setSuccessMessage(null);
    }
  }, [open]);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      let result;
      if (transaction) {
        result = await updateTransaction(transaction.id, formData);
      } else {
        result = await createTransaction(formData);
      }

      if (result.success) {
        setSuccessMessage(transaction ? t('updated') : t('added'));
        setTimeout(() => {
          if (result.success) {
            onClose();
          }
        }, 500);
      } else {
        setErrors(result.errors || {});
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ form: [tCommon('error')] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {transaction ? t('editTransaction') : t('addTransaction')}
          </SheetTitle>
          <SheetDescription>
            {transaction
              ? t('updateTransactionDetails')
              : t('enterTransactionDetails')}
          </SheetDescription>
        </SheetHeader>

        <form ref={formRef} onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="space-y-4 mt-6">
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
              {successMessage}
            </div>
          )}

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
              {errors.form[0]}
            </div>
          )}

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
                <SelectValue placeholder={t('selectAccountPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && (
              <p className="text-sm text-red-600">{errors.account_id[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">{t('date')}</Label>
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={transaction?.date || today}
              required
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payee">{t('payee')}</Label>
            <Input
              id="payee"
              name="payee"
              type="text"
              defaultValue={transaction?.payee}
              required
            />
            {errors.payee && (
              <p className="text-sm text-red-600">{errors.payee[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_id">{t('category')}</Label>
            <Select
              name="category_id"
              defaultValue={transaction?.category_id?.toString() || 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('uncategorized')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.path}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-red-600">{errors.category_id[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">{t('amount')}</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              defaultValue={transaction?.amount}
              placeholder={t('amountPlaceholder')}
              required
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">{t('comment')}</Label>
            <Textarea
              id="comment"
              name="comment"
              defaultValue={transaction?.comment || ''}
              rows={3}
            />
            {errors.comment && (
              <p className="text-sm text-red-600">{errors.comment[0]}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? tCommon('loading') : (transaction ? tCommon('save') : tCommon('save'))}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
