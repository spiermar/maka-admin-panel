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
import { createUnitAction, updateUnitAction } from '@/lib/actions/rentals';
import { UnitStatus } from '@/lib/db/types';

interface PropertyOption {
  id: number;
  name: string;
}

interface UnitFormValues {
  property_id: string;
  unit_number: string;
  unit_type: string;
  bedrooms: string;
  bathrooms: string;
  status: UnitStatus;
  building_label: string;
}

interface UnitFormProps {
  mode: 'create' | 'edit';
  properties: PropertyOption[];
  lang: string;
  cancelHref: string;
  redirectOnSuccess: string;
  unitId?: number;
  initialValues?: Partial<UnitFormValues>;
}

const STATUS_OPTIONS: UnitStatus[] = ['Vacant', 'Occupied', 'Unavailable'];

function toStringOrEmpty(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value);
}

export function UnitForm({
  mode,
  properties,
  lang,
  cancelHref,
  redirectOnSuccess,
  unitId,
  initialValues,
}: UnitFormProps) {
  const t = useTranslations('rentals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [propertyId, setPropertyId] = useState(
    initialValues?.property_id ?? toStringOrEmpty(properties[0]?.id)
  );
  const [status, setStatus] = useState<UnitStatus>(initialValues?.status ?? 'Vacant');

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    if (mode === 'create') {
      const result = await createUnitAction(formData);
      setIsSubmitting(false);

      if (!result.success) {
        setError(result.error ?? t('form.saveError'));
        return;
      }

      router.push(`/rentals/units/${result.unitId}?lang=${lang}`);
      return;
    }

    const result = await updateUnitAction(unitId!, formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? t('form.saveError'));
      return;
    }

    router.push(redirectOnSuccess);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="status" value={status} />

      <div className="space-y-2">
        <Label>{t('form.property')}</Label>
        <Select value={propertyId} onValueChange={setPropertyId}>
          <SelectTrigger data-testid="unit-form-property">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit_number">{t('form.unitNumber')}</Label>
        <Input
          data-testid="unit-form-unit-number"
          id="unit_number"
          name="unit_number"
          defaultValue={toStringOrEmpty(initialValues?.unit_number)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="building_label">{t('form.buildingLabel')}</Label>
        <Input
          data-testid="unit-form-building-label"
          id="building_label"
          name="building_label"
          defaultValue={toStringOrEmpty(initialValues?.building_label)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit_type">{t('form.unitType')}</Label>
        <Input
          data-testid="unit-form-unit-type"
          id="unit_type"
          name="unit_type"
          defaultValue={toStringOrEmpty(initialValues?.unit_type)}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">{t('form.bedrooms')}</Label>
          <Input
            data-testid="unit-form-bedrooms"
            id="bedrooms"
            name="bedrooms"
            type="number"
            step="0.5"
            min="0"
            defaultValue={toStringOrEmpty(initialValues?.bedrooms)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bathrooms">{t('form.bathrooms')}</Label>
          <Input
            data-testid="unit-form-bathrooms"
            id="bathrooms"
            name="bathrooms"
            type="number"
            step="0.5"
            min="0"
            defaultValue={toStringOrEmpty(initialValues?.bathrooms)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('form.status')}</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as UnitStatus)}>
          <SelectTrigger data-testid="unit-form-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`status.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} data-testid="unit-form-submit">
          {isSubmitting
            ? t('form.saving')
            : mode === 'create'
              ? t('form.create')
              : t('form.update')}
        </Button>
        <Button variant="outline" asChild data-testid="unit-form-cancel">
          <Link href={cancelHref}>{tCommon('cancel')}</Link>
        </Button>
      </div>
    </form>
  );
}
