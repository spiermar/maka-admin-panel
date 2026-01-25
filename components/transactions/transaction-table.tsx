'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TransactionWithDetails } from '@/lib/db/types';
import { deleteTransaction } from '@/lib/actions/transactions';

interface TransactionTableProps {
  transactions: TransactionWithDetails[];
  onEdit: (transaction: TransactionWithDetails) => void;
}

export function TransactionTable({
  transactions,
  onEdit,
}: TransactionTableProps) {
  const [deleting, setDeleting] = useState<number | null>(null);

  const handleDelete = async (id: number, accountId: number) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setDeleting(id);
    await deleteTransaction(id, accountId);
    setDeleting(null);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Payee</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Amount</TableHead>
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
              No transactions yet
            </TableCell>
          </TableRow>
        ) : (
          transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.date}</TableCell>
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
                ${parseFloat(transaction.amount).toFixed(2)}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {transaction.comment}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(transaction)}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    handleDelete(transaction.id, transaction.account_id)
                  }
                  disabled={deleting === transaction.id}
                >
                  {deleting === transaction.id ? 'Deleting...' : 'Delete'}
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
