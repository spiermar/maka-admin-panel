import { getAllAccounts } from '@/lib/db/accounts';
import { getAllCategoriesWithPaths } from '@/lib/db/categories';
import { SettingsClient } from './client';

export default async function SettingsPage() {
  const [accounts, categories] = await Promise.all([
    getAllAccounts(),
    getAllCategoriesWithPaths(),
  ]);

  return <SettingsClient accounts={accounts} categories={categories} />;
}
