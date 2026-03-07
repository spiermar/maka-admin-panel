import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createTenantAction } from '@/lib/actions/rentals';
import { getLangFromUrl } from '@/lib/i18n/utils';

export default async function NewTenantPage({
  searchParams: _searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const t = await getTranslations('rentals');
  const lang = await getLangFromUrl();

  async function createTenant(formData: FormData) {
    'use server';
    const result = await createTenantAction(formData);
    if (result.success && 'tenantId' in result) {
      redirect(`/rentals/tenants/${result.tenantId}?lang=${lang}`);
    }
    // If there's an error, rethrow to trigger form error display
    if (!result.success) {
      throw new Error(result.error || 'Failed to create tenant');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold">{t('tenants.newTitle')}</h2>
          <p className="text-muted-foreground">{t('tenants.newSubtitle')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/rentals/tenants?lang=${lang}`}>{t('tenants.backToList')}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tenants.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={async (formData) => {
            'use use server';
            try {
              await createTenant(formData);
            } catch (_error) {
              // Form will be re-rendered with error state
            }
          }} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('tenants.form.name')} *</Label>
              <Input
                id="name"
                name="name"
                required
                maxLength={200}
                placeholder={t('tenants.form.namePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t('tenants.form.phone')}</Label>
              <Input
                id="phone"
                name="phone"
                maxLength={20}
                placeholder={t('tenants.form.phonePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="email">{t('tenants.form.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                maxLength={255}
                placeholder={t('tenants.form.emailPlaceholder')}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit">{t('tenants.form.create')}</Button>
              <Button variant="outline" asChild>
                <Link href={`/rentals/tenants?lang=${lang}`}>{t('tenants.form.cancel')}</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}