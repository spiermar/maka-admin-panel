import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function DashboardNav() {
  return (
    <nav className="border-b bg-muted/40">
      <div className="container mx-auto px-4 py-2">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounts">Accounts</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
