'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createLeaseAction, updateLeaseAction } from '@/lib/actions/rentals';
import { Tenant } from '@/lib/db/types';
import { UnitInventoryRow } from '@/lib/db/rentals-units';

interface LeaseFormProps {
  mode: 'create' | 'edit';
  tenants: Tenant[];
  units: UnitInventoryRow[];
  lang: string;
  cancelHref: string;
  redirectOnSuccess: string;
  leaseId?: number;
  initialValues?: {
    tenant_id?: number;
    unit_id?: number;
    start_date?: string;
    end_date?: string;
    monthly_rent?: number;
    security_deposit?: number;
    lease_type?: string;
    pets_allowed?: boolean;
    parking_spot?: string;
    utilities_included?: boolean;
  };
}

function toStringOrEmpty(value: string | number | boolean | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

export function LeaseForm({
  mode,
  tenants,
  units,
  lang: _lang,
  cancelHref,
  redirectOnSuccess,
  leaseId,
  initialValues,
}: LeaseFormProps) {
  const t = useTranslations('rentals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tenantId, setTenantId] = useState(
    initialValues?.tenant_id?.toString() ?? tenants[0]?.id.toString() ?? ''
  );
  const [unitId, setUnitId] = useState(
    initialValues?.unit_id?.toString() ?? units[0]?.id.toString() ?? ''
  );

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    if (mode === 'create') {
      const result = await createLeaseAction(formData);
      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error ?? t('form.saveError'));
        return;
      }

      router.push(redirectOnSuccess);
      return;
    }

    const result = await updateLeaseAction(leaseId!, formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? t('form.saveError'));
      return;
    }

    router.push(redirectOnSuccess);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="tenant_id" value={tenantId} />
      <input type="hidden" name="unit_id" value={unitId} />

      <div className="space-y-2">
        <Label>{t('leases.form.tenant')}</Label>
        <Select value={tenantId} onValueChange={setTenantId}>
          <SelectTrigger data-testid="lease-form-tenant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id.toString()}>
                {tenant.name}
                {tenant.email ? ` (${tenant.email})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>{t('leases.form.unit')}</Label>
        <Select value={unitId} onValueChange={setUnitId}>
          <SelectTrigger data-testid="lease-form-unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {units.map((unit) => (
              <SelectItem key={unit.id} value={unit.id.toString()}>
                {unit.property_name} • {unit.unit_number}
                {unit.building_label ? ` (${unit.building_label})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">{t('leases.form.startDate')}</Label>
          <Input
            data-testid="lease-form-start-date"
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={toStringOrEmpty(initialValues?.start_date)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">{t('leases.form.endDate')}</Label>
          <Input
            data-testid="lease-form-end-date"
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={toStringOrEmpty(initialValues?.end_date)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthly_rent">{t('leases.form.monthlyRent')}</Label>
          <Input
            data-testid="lease-form-monthly-rent"
            id="monthly_rent"
            name="monthly_rent"
            type="number"
            step="0.01"
            min="0"
            defaultValue={toStringOrEmpty(initialValues?.monthly_rent)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="security_deposit">{t('leases.form.securityDeposit')}</Label>
          <Input
            data-testid="lease-form-security-deposit"
            id="security_deposit"
            name="security_deposit"
            type="number"
            step="0.01"
            min="0"
            defaultValue={toStringOrEmpty(initialValues?.security_deposit)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="lease_type">{t('leases.form.leaseType')}</Label>
        <Input
          data-testid="lease-form-lease-type"
          id="lease_type"
          name="lease_type"
          defaultValue={toStringOrEmpty(initialValues?.lease_type)}
          placeholder={t('leases.form.leaseTypePlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="pets_allowed">{t('leases.form.petsAllowed')}</Label>
          <Select
            value={initialValues?.pets_allowed === true ? 'true' : 'false'}
            onValueChange={(value) => {
              const input = document.getElementById('pets_allowed') as HTMLInputElement;
              if (input) input.value = value;
            }}
          >
            <SelectTrigger data-testid="lease-form-pets-allowed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">{t('common.no')}</SelectItem>
              <SelectItem value="true">{t('common.yes')}</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="pets_allowed" id="pets_allowed" value={initialValues?.pets_allowed === true ? 'true' : 'false'} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="utilities_included">{t('leases.form.utilitiesIncluded')}</Label>
          <Select
            value={initialValues?.utilities_included === true ? 'true' : 'false'}
            onValueChange={(value) => {
              const input = document.getElementById('utilities_included') as HTMLInputElement;
              if (input) input.value = value;
            }}
          >
            <SelectTrigger data-testid="lease-form-utilities-included">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="false">{t('common.no')}</SelectItem>
              <SelectItem value="true">{t('common.yes')}</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="utilities_included" id="utilities_included" value={initialValues?.utilities_included === true ? 'true' : 'false'} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="parking_spot">{t('leases.form.parkingSpot')}</Label>
          <Input
            data-testid="lease-form-parking-spot"
            id="parking_spot"
            name="parking_spot"
            defaultValue={toStringOrEmpty(initialValues?.parking_spot)}
            placeholder={t('leases.form.parkingSpotPlaceholder')}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} data-testid="lease-form-submit">
          {isSubmitting
            ? t('form.saving')
            : mode === 'create'
              ? t('form.create')
              : t('form.update')}
        </Button>
        <Button variant="outline" asChild data-testid="lease-form-cancel">
          <Link href={cancelHref}>{tCommon('cancel')}</Link>
        </Button>
      </div>
    </form>
  );
}