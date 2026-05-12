import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
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
import { formatCurrency, formatDate } from '@/lib/i18n/format';
import { getLangFromUrl } from '@/lib/i18n/utils';

export async function RecentTransactions() {
  const t = await getTranslations('transactions');
  const locale = await getLangFromUrl();
  const transactions = await getRecentTransactions(10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('date')}</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Payee</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead className="text-right">{t('amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t('noTransactions')}
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {formatDate(transaction.date, locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transactions?accountId=${transaction.account_id}&lang=${locale}`}
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
                    {formatCurrency(transaction.amount, locale)}
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
