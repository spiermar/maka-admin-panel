'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { createProperty, updateProperty } from '@/lib/db/rentals-properties';
import { createUnit, updateUnit } from '@/lib/db/rentals-units';
import { scheduleUnitOccupancyStatus } from '@/lib/db/rentals-occupancy';
import { createTenant, updateTenant } from '@/lib/db/rentals-tenants';
import { createLease, updateLease, transitionLeaseStatus, LeaseOverlapError, getLeaseById } from '@/lib/db/rentals-leases';
import { generateMonthlyCharges } from '@/lib/db/rentals-charges';
import { createPayment, allocatePaymentToCharges, getPaymentById } from '@/lib/db/rentals-payments';
import { getAllLeases } from '@/lib/db/rentals-leases';
import { emitAuditEvent } from '@/lib/db/rentals-audit';
import { getSession } from '@/lib/auth/session';
import { createPropertySchema, updatePropertySchema } from '@/lib/validations/rentals-property';
import { createPaymentSchema } from '@/lib/validations/rentals-payment';
import { createUnitSchema, updateUnitSchema } from '@/lib/validations/rentals-unit';
import { scheduleOccupancySchema } from '@/lib/validations/rentals-occupancy';
import { createTenantSchema, updateTenantSchema } from '@/lib/validations/rentals-tenant';
import { createLeaseSchema, updateLeaseSchema, transitionLeaseSchema } from '@/lib/validations/rentals-lease';

type RentalsActionResult =
  | { success: true }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

type CreateUnitActionResult =
  | { success: true; unitId: number }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

type CreateTenantActionResult =
  | { success: true; tenantId: number }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

type CreateLeaseActionResult =
  | { success: true; leaseId: number }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

function getFormValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' ? value : null;
}

async function getCurrentUserId(): Promise<number | null> {
  const session = await getSession();
  return session?.userId ?? null;
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

function handleCreateUnitError(error: unknown): CreateUnitActionResult {
  const code = (error as { code?: string } | null)?.code;

  if (code === '23505') {
    return {
      success: false,
      error: 'Unit number must be unique within the selected property',
    };
  }

  return {
    success: false,
    error: 'Failed to create unit',
  };
}

function handleCreateTenantError(error: unknown): CreateTenantActionResult {
  return {
    success: false,
    error: 'Failed to create tenant',
  };
}

function handleCreateLeaseError(error: unknown): CreateLeaseActionResult {
  const err = error as { code?: string; name?: string } | null;
  
  if (err?.code === 'LEASE_OVERLAP' || err?.name === 'LeaseOverlapError') {
    return {
      success: false,
      error: 'A lease already exists for this unit that overlaps with the selected dates',
    };
  }

  return {
    success: false,
    error: 'Failed to create lease',
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

export async function createUnitAction(formData: FormData): Promise<CreateUnitActionResult> {
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
    const unit = await createUnit(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/units');
    revalidatePath(`/rentals/units/${unit.id}`);
    revalidatePath(`/rentals/units/${unit.id}/edit`);
    return { success: true, unitId: unit.id };
  } catch (error) {
    console.error('Failed to create unit:', error);
    return handleCreateUnitError(error);
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
    revalidatePath(`/rentals/units/${id}/edit`);
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

// Tenant Actions

export async function createTenantAction(formData: FormData): Promise<CreateTenantActionResult> {
  await requireAuth();

  const result = createTenantSchema.safeParse({
    name: getFormValue(formData, 'name'),
    phone: getFormValue(formData, 'phone'),
    email: getFormValue(formData, 'email'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const tenant = await createTenant(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/tenants');
    revalidatePath(`/rentals/tenants/${tenant.id}`);
    return { success: true, tenantId: tenant.id };
  } catch (error) {
    console.error('Failed to create tenant:', error);
    return handleCreateTenantError(error);
  }
}

export async function updateTenantAction(
  id: number,
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = updateTenantSchema.safeParse({
    name: getFormValue(formData, 'name'),
    phone: getFormValue(formData, 'phone'),
    email: getFormValue(formData, 'email'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await updateTenant(id, result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/tenants');
    revalidatePath(`/rentals/tenants/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update tenant:', error);
    return handleDatabaseError(error);
  }
}

// Lease Actions

export async function createLeaseAction(formData: FormData): Promise<CreateLeaseActionResult> {
  await requireAuth();

  const result = createLeaseSchema.safeParse({
    tenant_id: getFormValue(formData, 'tenant_id'),
    unit_id: getFormValue(formData, 'unit_id'),
    start_date: getFormValue(formData, 'start_date'),
    end_date: getFormValue(formData, 'end_date'),
    monthly_rent: getFormValue(formData, 'monthly_rent'),
    security_deposit: getFormValue(formData, 'security_deposit'),
    lease_type: getFormValue(formData, 'lease_type'),
    pets_allowed: getFormValue(formData, 'pets_allowed'),
    parking_spot: getFormValue(formData, 'parking_spot'),
    utilities_included: getFormValue(formData, 'utilities_included'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const lease = await createLease(result.data);
    revalidatePath('/rentals');
    revalidatePath('/rentals/leases');
    revalidatePath(`/rentals/leases/${lease.id}`);
    return { success: true, leaseId: lease.id };
  } catch (error) {
    console.error('Failed to create lease:', error);
    return handleCreateLeaseError(error);
  }
}

export async function updateLeaseAction(
  id: number,
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = updateLeaseSchema.safeParse({
    tenant_id: getFormValue(formData, 'tenant_id'),
    unit_id: getFormValue(formData, 'unit_id'),
    start_date: getFormValue(formData, 'start_date'),
    end_date: getFormValue(formData, 'end_date'),
    monthly_rent: getFormValue(formData, 'monthly_rent'),
    security_deposit: getFormValue(formData, 'security_deposit'),
    lease_type: getFormValue(formData, 'lease_type'),
    pets_allowed: getFormValue(formData, 'pets_allowed'),
    parking_spot: getFormValue(formData, 'parking_spot'),
    utilities_included: getFormValue(formData, 'utilities_included'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Get current lease data before update for audit
    const oldLease = await getLeaseById(id);
    const oldMonthlyRent = oldLease?.monthly_rent ?? null;

    await updateLease(id, result.data);

    // Emit audit event if monthly rent changed
    const newMonthlyRent = result.data.monthly_rent ?? null;
    if (oldMonthlyRent !== null && newMonthlyRent !== null && oldMonthlyRent !== newMonthlyRent) {
      const userId = await getCurrentUserId();
      if (userId) {
        await emitAuditEvent({
          userId,
          eventType: 'rent_amount_edit',
          entityType: 'lease',
          entityId: id,
          oldValue: { monthly_rent: oldMonthlyRent },
          newValue: { monthly_rent: newMonthlyRent },
        });
      }
    }

    revalidatePath('/rentals');
    revalidatePath('/rentals/leases');
    revalidatePath(`/rentals/leases/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to update lease:', error);
    
    const err = error as { code?: string; name?: string } | null;
    if (err?.code === 'LEASE_OVERLAP' || err?.name === 'LeaseOverlapError') {
      return {
        success: false,
        error: 'A lease already exists for this unit that overlaps with the selected dates',
      };
    }
    
    return handleDatabaseError(error);
  }
}

export async function transitionLeaseAction(
  id: number,
  formData: FormData
): Promise<RentalsActionResult> {
  await requireAuth();

  const result = transitionLeaseSchema.safeParse({
    status: getFormValue(formData, 'status'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    // Get current lease data before status change for audit
    const oldLease = await getLeaseById(id);
    const oldStatus = oldLease?.status ?? null;

    await transitionLeaseStatus(id, result.data.status);

    // Emit audit event for status change
    if (oldStatus !== null && oldStatus !== result.data.status) {
      const userId = await getCurrentUserId();
      if (userId) {
        await emitAuditEvent({
          userId,
          eventType: 'lease_status_change',
          entityType: 'lease',
          entityId: id,
          oldValue: { status: oldStatus },
          newValue: { status: result.data.status },
        });
      }
    }

    revalidatePath('/rentals');
    revalidatePath('/rentals/leases');
    revalidatePath(`/rentals/leases/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to transition lease status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transition lease status',
    };
  }
}

// Charge Actions

type GenerateChargesResult =
  | { success: true; count: number }
  | { success: false; error: string };

export async function generateChargesAction(
  year: number,
  month: number
): Promise<GenerateChargesResult> {
  await requireAuth();

  try {
    const charges = await generateMonthlyCharges(year, month);
    revalidatePath('/rentals/charges');
    revalidatePath('/rentals/leases');
    return { success: true, count: charges.length };
  } catch (error) {
    console.error('Failed to generate charges:', error);
    return { success: false, error: 'Failed to generate charges' };
  }
}

// Payment Actions

type CreatePaymentActionResult =
  | { success: true; paymentId: number }
  | {
      success: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

function handleCreatePaymentError(error: unknown): CreatePaymentActionResult {
  return {
    success: false,
    error: 'Failed to create payment',
  };
}

export async function createPaymentAction(
  formData: FormData
): Promise<CreatePaymentActionResult> {
  await requireAuth();

  const result = createPaymentSchema.safeParse({
    lease_id: getFormValue(formData, 'lease_id'),
    payment_date: getFormValue(formData, 'payment_date'),
    amount: getFormValue(formData, 'amount'),
    payment_method: getFormValue(formData, 'payment_method'),
    notes: getFormValue(formData, 'notes'),
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const payment = await createPayment(result.data);
    // Auto-allocate payment to oldest pending charges
    await allocatePaymentToCharges(payment.id);

    // Emit audit event for payment creation
    const userId = await getCurrentUserId();
    if (userId) {
      await emitAuditEvent({
        userId,
        eventType: 'payment_adjustment',
        entityType: 'payment',
        entityId: payment.id,
        oldValue: null,
        newValue: {
          lease_id: result.data.lease_id,
          payment_date: result.data.payment_date,
          amount: result.data.amount,
          payment_method: result.data.payment_method,
        },
      });
    }

    revalidatePath('/rentals/payments');
    revalidatePath('/rentals/charges');
    revalidatePath('/rentals/leases');
    return { success: true, paymentId: payment.id };
  } catch (error) {
    console.error('Failed to create payment:', error);
    return handleCreatePaymentError(error);
  }
}
