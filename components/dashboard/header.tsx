import { getTranslations } from 'next-intl/server';
import { logout } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { requireAuth } from '@/lib/auth/session';

export async function DashboardHeader() {
  const user = await requireAuth();
  const t = await getTranslations('auth');
  const app = await getTranslations('app');

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{app('name')}</h1>
          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
            {app('company')}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user.username}
          </span>
          <form action={logout}>
            <Button variant="outline" size="sm" type="submit">
              {t('logout')}
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
