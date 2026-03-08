import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllTenants } from '@/lib/db/rentals-tenants';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();
  const { search } = await searchParams;

  const tenants = await getAllTenants(search);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('tenants.title')}</h2>
          <p className="text-muted-foreground">{t('tenants.subtitle')}</p>
        </div>
        <Button asChild>
          <Link href={`/rentals/tenants/new?lang=${lang}`}>{t('tenants.newTenant')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.listTitle')}</CardTitle>
          <form className="mt-4">
            <Input
              name="search"
              placeholder={t('tenants.searchPlaceholder')}
              defaultValue={search || ''}
              className="max-w-sm"
            />
          </form>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('tenants.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      {t('tenants.columns.name')}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      {t('tenants.columns.phone')}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      {t('tenants.columns.email')}
                    </th>
                    <th className="pb-3 text-left text-sm font-medium text-muted-foreground">
                      {t('tenants.columns.created')}
                    </th>
                    <th className="pb-3 text-right text-sm font-medium text-muted-foreground">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b">
                      <td className="py-3">
                        <Link
                          href={`/rentals/tenants/${tenant.id}?lang=${lang}`}
                          className="font-medium hover:underline"
                        >
                          {tenant.name}
                        </Link>
                      </td>
                      <td className="py-3 text-muted-foreground">{tenant.phone || '-'}</td>
                      <td className="py-3 text-muted-foreground">{tenant.email || '-'}</td>
                      <td className="py-3 text-muted-foreground">
                        {tenant.created_at
                          ? new Date(tenant.created_at).toLocaleDateString(lang)
                          : '-'}
                      </td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/rentals/tenants/${tenant.id}?lang=${lang}`}>
                            {t('tenants.view')}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}