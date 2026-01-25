import { logout } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';

export async function DashboardHeader() {
  const user = await requireAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financial Ledger</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.username}
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              Logout
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
