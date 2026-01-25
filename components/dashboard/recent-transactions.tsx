import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getRecentTransactions } from '@/lib/db/transactions';

export async function RecentTransactions() {
  const transactions = await getRecentTransactions(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No transactions yet
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/accounts/${transaction.account_id}`}
                      className="hover:underline"
                    >
                      {transaction.account_name}
                    </Link>
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
                    ${parseFloat(transaction.amount).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
