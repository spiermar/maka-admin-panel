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
import { createPaymentAction } from '@/lib/actions/rentals';
import { LeaseOption } from '@/lib/db/rentals-leases';

interface PaymentFormProps {
  leases: LeaseOption[];
  lang: string;
  cancelHref: string;
  redirectOnSuccess: string;
}

function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PaymentForm({
  leases,
  lang,
  cancelHref,
  redirectOnSuccess,
}: PaymentFormProps) {
  const t = useTranslations('rentals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leaseId, setLeaseId] = useState(leases[0]?.id.toString() ?? '');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  async function handleSubmit(formData: FormData) {
    setError(null);
    setIsSubmitting(true);

    const result = await createPaymentAction(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? t('form.saveError'));
      return;
    }

    router.push(redirectOnSuccess);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="lease_id" value={leaseId} />

      <div className="space-y-2">
        <Label>{t('payments.form.lease')}</Label>
        <Select value={leaseId} onValueChange={setLeaseId}>
          <SelectTrigger data-testid="payment-form-lease">
            <SelectValue placeholder={t('payments.form.selectLease')} />
          </SelectTrigger>
          <SelectContent>
            {leases.map((lease) => (
              <SelectItem key={lease.id} value={lease.id.toString()}>
                {lease.tenant_name} - {lease.property_name} • Unit {lease.unit_number}
                (${lease.monthly_rent}/mo)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="payment_date">{t('payments.form.paymentDate')}</Label>
          <Input
            data-testid="payment-form-date"
            id="payment_date"
            name="payment_date"
            type="date"
            defaultValue={getTodayDate()}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">{t('payments.form.amount')}</Label>
          <Input
            data-testid="payment-form-amount"
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('payments.form.paymentMethod')}</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger data-testid="payment-form-method">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">{t('paymentMethod.cash')}</SelectItem>
            <SelectItem value="check">{t('paymentMethod.check')}</SelectItem>
            <SelectItem value="bank_transfer">{t('paymentMethod.bank_transfer')}</SelectItem>
            <SelectItem value="other">{t('paymentMethod.other')}</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="payment_method" value={paymentMethod} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t('payments.form.notes')}</Label>
        <Input
          data-testid="payment-form-notes"
          id="notes"
          name="notes"
          placeholder={t('payments.form.notesPlaceholder')}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting} data-testid="payment-form-submit">
          {isSubmitting ? t('form.saving') : t('form.record')}
        </Button>
        <Button variant="outline" asChild data-testid="payment-form-cancel">
          <Link href={cancelHref}>{tCommon('cancel')}</Link>
        </Button>
      </div>
    </form>
  );
}