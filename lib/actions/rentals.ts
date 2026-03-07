'use server';

import { requireAuth } from '@/lib/auth/session';

type CreateRentalResult =
  | { success: true }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

export async function createRental(formData: FormData): Promise<CreateRentalResult> {
  await requireAuth();

  const data = {
    property_name: String(formData.get('property_name') || '').trim(),
    unit_name: String(formData.get('unit_name') || '').trim(),
  };

  const errors: Record<string, string[] | undefined> = {};

  if (!data.property_name) {
    errors.property_name = ['Property name is required'];
  }

  if (!data.unit_name) {
    errors.unit_name = ['Unit name is required'];
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Phase 1 baseline: action contract exists and enforces auth.
  return { success: false, error: 'Rental creation will be enabled in a later phase' };
}
