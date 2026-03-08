import { execute, executeReturning, queryOne, queryMany } from './index';
import { Lease, LeaseStatus } from './types';
import { CreateLeaseInput, UpdateLeaseInput } from '@/lib/validations/rentals-lease';

export class LeaseOverlapError extends Error {
  code: string;
  constructor(message: string) {
    super(message);
    this.name = 'LeaseOverlapError';
    this.code = 'LEASE_OVERLAP';
  }
}

// Valid status transitions
const VALID_TRANSITIONS: Record<LeaseStatus, LeaseStatus[]> = {
  'Draft': ['Pending'],
  'Pending': ['Active'],
  'Active': ['Expired', 'Terminated'],
  'Expired': [],
  'Terminated': [],
};

export function isValidStatusTransition(
  currentStatus: LeaseStatus,
  newStatus: LeaseStatus
): boolean {
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// Check for lease overlap
export async function checkLeaseOverlap(
  unitId: number,
  startDate: string,
  endDate: string,
  excludeLeaseId?: number
): Promise<boolean> {
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM leases 
     WHERE unit_id = $1 
       AND status NOT IN ('Terminated', 'Expired')
       AND (start_date, end_date) OVERLAPS ($2::date, $3::date)
       ${excludeLeaseId ? 'AND id != $4' : ''}`,
    excludeLeaseId
      ? [unitId, startDate, endDate, excludeLeaseId]
      : [unitId, startDate, endDate]
  );
  return existing !== null;
}

// Create lease
export async function createLease(data: CreateLeaseInput): Promise<Lease> {
  const hasOverlap = await checkLeaseOverlap(
    data.unit_id,
    data.start_date,
    data.end_date
  );
  
  if (hasOverlap) {
    throw new LeaseOverlapError(
      'A lease already exists for this unit that overlaps with the selected dates'
    );
  }

  return executeReturning<Lease>(
    `INSERT INTO leases (
      tenant_id,
      unit_id,
      status,
      start_date,
      end_date,
      monthly_rent,
      security_deposit,
      lease_type,
      pets_allowed,
      parking_spot,
      utilities_included
    )
    VALUES ($1, $2, 'Draft', $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      data.tenant_id,
      data.unit_id,
      data.start_date,
      data.end_date,
      data.monthly_rent,
      data.security_deposit,
      data.lease_type || null,
      data.pets_allowed ?? null,
      data.parking_spot || null,
      data.utilities_included ?? null,
    ]
  );
}

// Get lease by ID
export async function getLeaseById(id: number): Promise<Lease | null> {
  return queryOne<Lease>('SELECT * FROM leases WHERE id = $1', [id]);
}

// Get all leases with optional filters
export interface LeaseFilters {
  status?: LeaseStatus;
  unit_id?: number;
  tenant_id?: number;
}

export async function getAllLeases(filters?: LeaseFilters): Promise<Lease[]> {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    conditions.push(`status = $${paramIndex++}`);
    values.push(filters.status);
  }
  if (filters?.unit_id) {
    conditions.push(`unit_id = $${paramIndex++}`);
    values.push(filters.unit_id);
  }
  if (filters?.tenant_id) {
    conditions.push(`tenant_id = $${paramIndex++}`);
    values.push(filters.tenant_id);
  }

  const whereClause = conditions.length > 0 
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  return queryMany<Lease>(
    `SELECT * FROM leases ${whereClause} ORDER BY start_date DESC`,
    values
  );
}

// Update lease
export async function updateLease(id: number, data: UpdateLeaseInput): Promise<Lease> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let paramIndex = 1;

  // Check for overlap if dates are being changed
  if (data.start_date || data.end_date) {
    const existing = await getLeaseById(id);
    if (!existing) {
      throw new Error('Lease not found');
    }

    const startDate = data.start_date ?? existing.start_date;
    const endDate = data.end_date ?? existing.end_date;

    const hasOverlap = await checkLeaseOverlap(
      existing.unit_id,
      startDate,
      endDate,
      id
    );

    if (hasOverlap) {
      throw new LeaseOverlapError(
        'A lease already exists for this unit that overlaps with the selected dates'
      );
    }
  }

  if (data.start_date !== undefined) {
    fields.push(`start_date = $${paramIndex++}`);
    values.push(data.start_date);
  }
  if (data.end_date !== undefined) {
    fields.push(`end_date = $${paramIndex++}`);
    values.push(data.end_date);
  }
  if (data.monthly_rent !== undefined) {
    fields.push(`monthly_rent = $${paramIndex++}`);
    values.push(data.monthly_rent);
  }
  if (data.security_deposit !== undefined) {
    fields.push(`security_deposit = $${paramIndex++}`);
    values.push(data.security_deposit);
  }
  if (data.lease_type !== undefined) {
    fields.push(`lease_type = $${paramIndex++}`);
    values.push(data.lease_type || null);
  }
  if (data.pets_allowed !== undefined) {
    fields.push(`pets_allowed = $${paramIndex++}`);
    values.push(data.pets_allowed ?? null);
  }
  if (data.parking_spot !== undefined) {
    fields.push(`parking_spot = $${paramIndex++}`);
    values.push(data.parking_spot || null);
  }
  if (data.utilities_included !== undefined) {
    fields.push(`utilities_included = $${paramIndex++}`);
    values.push(data.utilities_included ?? null);
  }

  if (fields.length === 0) {
    // No fields to update, just return current lease
    const lease = await getLeaseById(id);
    if (!lease) {
      throw new Error('Lease not found');
    }
    return lease;
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return executeReturning<Lease>(
    `UPDATE leases SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

// Transition lease status
export async function transitionLeaseStatus(
  id: number,
  newStatus: LeaseStatus
): Promise<Lease> {
  const existing = await getLeaseById(id);
  
  if (!existing) {
    throw new Error('Lease not found');
  }

  if (!isValidStatusTransition(existing.status, newStatus)) {
    throw new Error(
      `Invalid status transition from ${existing.status} to ${newStatus}`
    );
  }

  return executeReturning<Lease>(
    `UPDATE leases SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [newStatus, id]
  );
}

// Get lease options for dropdowns (with tenant and unit info)
export interface LeaseOption {
  id: number;
  tenant_name: string;
  unit_number: string;
  property_name: string;
  monthly_rent: number;
}

export async function getLeaseOptions(status?: LeaseStatus): Promise<LeaseOption[]> {
  return queryMany<LeaseOption>(
    `SELECT 
       l.id, 
       t.name as tenant_name, 
       u.unit_number, 
       prop.name as property_name,
       l.monthly_rent
     FROM leases l
     JOIN tenants t ON l.tenant_id = t.id
     JOIN units u ON l.unit_id = u.id
     JOIN properties prop ON u.property_id = prop.id
     WHERE l.status = $1
     ORDER BY prop.name, u.unit_number`,
    status ? [status] : []
  );
}