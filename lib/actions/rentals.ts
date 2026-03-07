'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { createProperty, updateProperty } from '@/lib/db/rentals-properties';
import { createUnit, updateUnit } from '@/lib/db/rentals-units';
import { scheduleUnitOccupancyStatus } from '@/lib/db/rentals-occupancy';
import { createPropertySchema, updatePropertySchema } from '@/lib/validations/rentals-property';
import { createUnitSchema, updateUnitSchema } from '@/lib/validations/rentals-unit';
import { scheduleOccupancySchema } from '@/lib/validations/rentals-occupancy';

type RentalsActionResult =
  | { success: true }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

function getFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

function handleDatabaseError(error: unknown): RentalsActionResult {
  const code = (error as { code?: string } | null)?.code;

  if (code === '23505') {
    return {
      success: false,
      error: 'Unit number must be unique within the selected property',
    };
  }

  return {
    success: false,
    error: 'Failed to save rentals data',
  };
}

export async function createPropertyAction(formData: FormData): Promise<RentalsActionResult> {
  await requireAuth();

  const result = createPropertySchema.safeParse({
    name: getFormValue(formData, 'name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await createProperty(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/properties');
    return { success: true };
  } catch (error) {
    console.error('Failed to create property:', error);
    return handleDatabaseError(error);
  }
}

export async function updatePropertyAction(
  id: number,
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = updatePropertySchema.safeParse({
    name: getFormValue(formData, 'name'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await updateProperty(id, result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/properties');
    revalidatePath(`/rentals/properties/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update property:', error);
    return handleDatabaseError(error);
  }
}

export async function createUnitAction(formData: FormData): Promise<RentalsActionResult> {
  await requireAuth();

  const result = createUnitSchema.safeParse({
    property_id: getFormValue(formData, 'property_id'),
    unit_number: getFormValue(formData, 'unit_number'),
    unit_type: getFormValue(formData, 'unit_type'),
    bedrooms: getFormValue(formData, 'bedrooms'),
    bathrooms: getFormValue(formData, 'bathrooms'),
    status: getFormValue(formData, 'status'),
    building_label: getFormValue(formData, 'building_label'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await createUnit(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/units');
    return { success: true };
  } catch (error) {
    console.error('Failed to create unit:', error);
    return handleDatabaseError(error);
  }
}

export async function updateUnitAction(
  id: number,
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = updateUnitSchema.safeParse({
    property_id: getFormValue(formData, 'property_id'),
    unit_number: getFormValue(formData, 'unit_number'),
    unit_type: getFormValue(formData, 'unit_type'),
    bedrooms: getFormValue(formData, 'bedrooms'),
    bathrooms: getFormValue(formData, 'bathrooms'),
    status: getFormValue(formData, 'status'),
    building_label: getFormValue(formData, 'building_label'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const requiredUpdateFields = [
    'property_id',
    'unit_number',
    'unit_type',
    'bedrooms',
    'bathrooms',
    'status',
  ];

  for (const field of requiredUpdateFields) {
    if (result.data[field as keyof typeof result.data] === undefined) {
      return {
        success: false,
        errors: { [field]: [`${field} is required`] },
      };
    }
  }

  try {
    await updateUnit(id, {
      property_id: result.data.property_id as number,
      unit_number: result.data.unit_number as string,
      unit_type: result.data.unit_type as string,
      bedrooms: result.data.bedrooms as number,
      bathrooms: result.data.bathrooms as number,
      status: result.data.status as 'Occupied' | 'Vacant' | 'Unavailable',
      building_label: result.data.building_label ?? null,
    });

    revalidatePath('/rentals');
    revalidatePath('/rentals/units');
    revalidatePath(`/rentals/units/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update unit:', error);
    return handleDatabaseError(error);
  }
}

export async function createRental(formData: FormData): Promise<RentalsActionResult> {
  await requireAuth();
  const result = createUnitSchema.safeParse({
    property_id: getFormValue(formData, 'property_id'),
    unit_number: getFormValue(formData, 'unit_number'),
    unit_type: getFormValue(formData, 'unit_type'),
    bedrooms: getFormValue(formData, 'bedrooms'),
    bathrooms: getFormValue(formData, 'bathrooms'),
    status: getFormValue(formData, 'status'),
    building_label: getFormValue(formData, 'building_label'),
  });

  if (!result.success) {
    return {
      success: false,
      error: 'Rental creation will be enabled in a later phase',
    };
  }

  try {
    await createUnit(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/units');
    return { success: true };
  } catch (error) {
    console.error('Failed to create rental:', error);
    return handleDatabaseError(error);
  }
}

export async function scheduleUnitOccupancyStatusAction(
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = scheduleOccupancySchema.safeParse({
    unit_id: getFormValue(formData, 'unit_id'),
    status: getFormValue(formData, 'status'),
    effective_date: getFormValue(formData, 'effective_date'),
    unavailable_reason: getFormValue(formData, 'unavailable_reason'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await scheduleUnitOccupancyStatus(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/units');
    revalidatePath(`/rentals/units/${result.data.unit_id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to schedule occupancy status:', error);

    const code = (error as { code?: string } | null)?.code;
    if (code === 'OCCUPANCY_OVERLAP' || code === '23505') {
      return {
        success: false,
        error:
          'An occupancy status is already scheduled for this unit on the selected effective date',
      };
    }

    return {
      success: false,
      error: 'Failed to schedule occupancy status',
    };
  }
}
