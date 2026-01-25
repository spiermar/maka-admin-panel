import { requireAuth } from '@/lib/auth/session';
import { DashboardHeader } from '@/components/dashboard/header';
import { DashboardNav } from '@/components/dashboard/nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth(); // Protect all dashboard routes

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader />
      <DashboardNav />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
