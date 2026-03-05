'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TransactionWithDetails } from '@/lib/db/types';
import { deleteTransaction } from '@/lib/actions/transactions';
import { Info } from 'lucide-react';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  lang?: string;
  onEdit: (transaction: TransactionWithDetails) => void;
}

export function TransactionTable({
  transactions,
  lang = 'en',
  onEdit,
}: TransactionTableProps) {
  const t = useTranslations('transactions');
  const tCommon = useTranslations('common');
  const [deleting, setDeleting] = useState<number | null>(null);
  const [infoTransaction, setInfoTransaction] =
    useState<TransactionWithDetails | null>(null);

  const formatCurrency = useMemo(() => {
    return (amount: string) => {
      return new Intl.NumberFormat(lang, {
        style: 'currency',
        currency: lang === 'pt-BR' ? 'BRL' : 'USD',
      }).format(parseFloat(amount));
    };
  }, [lang]);

  const formatDate = (date: string) => {
    return new Date(
      typeof date === 'string' ? date + 'T00:00:00' : date
    ).toLocaleDateString(lang, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (id: number, accountId: number) => {
    if (!confirm(t('deleteConfirm'))) {
      return;
    }

    setDeleting(id);
    await deleteTransaction(id, accountId);
    setDeleting(null);
  };

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('date')}</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>{t('category')}</TableHead>
          <TableHead className="text-right">{t('amount')}</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              {t('noTransactions')}
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>
                {formatDate(transaction.date)}
              </TableCell>
              <TableCell>{transaction.payee}</TableCell>
              <TableCell>
                {transaction.category_path || 'Uncategorized'}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  parseFloat(transaction.amount) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {transaction.comment}
              </TableCell>
              <TableCell className="text-right space-x-2">
                {transaction.ofx_fitid && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setInfoTransaction(transaction)}
                    title="View OFX details"
                  >
                    <Info className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  {tCommon('edit')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleDelete(transaction.id, transaction.account_id)
                  }
                  disabled={deleting === transaction.id}
                >
                  {deleting === transaction.id ? 'Deleting...' : tCommon('delete')}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>

    {infoTransaction && (
      <Dialog
        open={!!infoTransaction}
        onOpenChange={() => setInfoTransaction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>OFX Transaction Details</DialogTitle>
          </DialogHeader>
          <dl className="space-y-3">
            <div>
              <dt className="font-medium text-sm text-muted-foreground">FITID</dt>
              <dd className="text-sm break-all">{infoTransaction.ofx_fitid ?? ''}</dd>
            </div>
            <div>
              <dt className="font-medium text-sm text-muted-foreground">REFNUM</dt>
              <dd className="text-sm break-all">{infoTransaction.ofx_refnum ?? ''}</dd>
            </div>
            <div>
              <dt className="font-medium text-sm text-muted-foreground">Original MEMO</dt>
              <dd className="text-sm">{infoTransaction.ofx_memo ?? ''}</dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
