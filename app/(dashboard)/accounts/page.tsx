import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllAccountsWithBalances } from '@/lib/db/accounts';

export default async function AccountsPage() {
  const accounts = await getAllAccountsWithBalances();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Accounts</h2>
          <p className="text-muted-foreground">
            Manage your financial accounts
          </p>
        </div>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No accounts found.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{account.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold ${
                      parseFloat(account.balance) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    ${parseFloat(account.balance).toFixed(2)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
