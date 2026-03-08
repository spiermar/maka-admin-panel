import { executeReturning, queryOne, queryMany } from './index';
import { Tenant } from './types';
import { CreateTenantInput } from '@/lib/validations/rentals-tenant';

// Create tenant
export async function createTenant(data: CreateTenantInput): Promise<Tenant> {
  return executeReturning<Tenant>(
    `INSERT INTO tenants (name, phone, email)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [
      data.name,
      data.phone || null,
      data.email || null,
    ]
  );
}

// Get tenant by ID
export async function getTenantById(id: number): Promise<Tenant | null> {
  return queryOne<Tenant>('SELECT * FROM tenants WHERE id = $1', [id]);
}

// Get all tenants (with optional search)
export async function getAllTenants(search?: string): Promise<Tenant[]> {
  if (search) {
    return queryMany<Tenant>(
      `SELECT * FROM tenants 
       WHERE name ILIKE $1 OR email ILIKE $1
       ORDER BY name ASC`,
      [`%${search}%`]
    );
  }
  return queryMany<Tenant>('SELECT * FROM tenants ORDER BY name ASC');
}

// Update tenant
export async function updateTenant(id: number, data: Partial<CreateTenantInput>): Promise<Tenant> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(data.phone || null);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(data.email || null);
  }

  fields.push(`updated_at = NOW()`);
  values.push(id);

  return executeReturning<Tenant>(
    `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
}

// Get tenant by unit ID (for lease linking)
export async function getTenantByUnitId(unitId: number): Promise<Tenant | null> {
  return queryOne<Tenant>(
    `SELECT t.* FROM tenants t
     JOIN leases l ON l.tenant_id = t.id
     WHERE l.unit_id = $1 AND l.status = 'Active'
     LIMIT 1`,
    [unitId]
  );
}