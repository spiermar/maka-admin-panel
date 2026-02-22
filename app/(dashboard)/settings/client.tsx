'use client';

import { useTranslations } from 'next-intl';
import { Account, CategoryWithPath } from '@/lib/db/types';
import { AccountManager } from '@/components/settings/account-manager';
import { CategoryManager } from '@/components/settings/category-manager';

interface SettingsClientProps {
  accounts: Account[];
  categories: CategoryWithPath[];
}

export function SettingsClient({ accounts, categories }: SettingsClientProps) {
  const t = useTranslations('settings');

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{t('title')}</h2>

      <AccountManager accounts={accounts} />

      <CategoryManager categories={categories} />
    </div>
  );
}
