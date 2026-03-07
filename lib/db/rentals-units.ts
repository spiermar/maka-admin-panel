import { execute, executeReturning, queryMany, queryOne } from './index';
import { Unit, UnitStatus } from './types';

export interface CreateUnitInput {
  property_id: number;
  unit_number: string;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  status: UnitStatus;
  building_label?: string | null;
}

export interface UpdateUnitInput extends CreateUnitInput {}

export interface UnitInventoryRow {
  id: number;
  property_id: number;
  property_name: string;
  unit_number: string;
  building_label: string | null;
  unit_type: string;
  bedrooms: string;
  bathrooms: string;
  current_status: UnitStatus;
  current_effective_date: string | null;
  next_status: UnitStatus | null;
  next_effective_date: string | null;
}

const UNIT_INVENTORY_SELECT = `
  SELECT
    u.id,
    u.property_id,
    p.name AS property_name,
    u.unit_number,
    u.building_label,
    u.unit_type,
    u.bedrooms::text AS bedrooms,
    u.bathrooms::text AS bathrooms,
    COALESCE(current_status.status, u.status)::text AS current_status,
    current_status.effective_date::text AS current_effective_date,
    next_status.status::text AS next_status,
    next_status.effective_date::text AS next_effective_date
  FROM units u
  INNER JOIN properties p ON p.id = u.property_id
  LEFT JOIN LATERAL (
    SELECT status, effective_date
    FROM unit_occupancy_statuses
    WHERE unit_id = u.id
      AND effective_date <= CURRENT_DATE
    ORDER BY effective_date DESC, id DESC
    LIMIT 1
  ) current_status ON TRUE
  LEFT JOIN LATERAL (
    SELECT status, effective_date
    FROM unit_occupancy_statuses
    WHERE unit_id = u.id
      AND effective_date > CURRENT_DATE
    ORDER BY effective_date ASC, id ASC
    LIMIT 1
  ) next_status ON TRUE
`;

export async function getUnitsByProperty(propertyId: number): Promise<Unit[]> {
  return queryMany<Unit>(
    'SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number ASC',
    [propertyId]
  );
}

export async function getUnitById(id: number): Promise<Unit | null> {
  return queryOne<Unit>('SELECT * FROM units WHERE id = $1', [id]);
}

export async function listUnitsInventory(): Promise<UnitInventoryRow[]> {
  return queryMany<UnitInventoryRow>(
    `${UNIT_INVENTORY_SELECT}
     ORDER BY p.name ASC, u.unit_number ASC`,
    []
  );
}

export async function getUnitInventoryById(id: number): Promise<UnitInventoryRow | null> {
  return queryOne<UnitInventoryRow>(
    `${UNIT_INVENTORY_SELECT}
     WHERE u.id = $1`,
    [id]
  );
}

export async function createUnit(data: CreateUnitInput): Promise<Unit> {
  return executeReturning<Unit>(
    `INSERT INTO units (
       property_id,
       unit_number,
       unit_type,
       bedrooms,
       bathrooms,
       status,
       building_label
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.property_id,
      data.unit_number,
      data.unit_type,
      data.bedrooms,
      data.bathrooms,
      data.status,
      data.building_label ?? null,
    ]
  );
}

export async function updateUnit(id: number, data: UpdateUnitInput): Promise<void> {
  await execute(
    `UPDATE units
     SET property_id = $1,
         unit_number = $2,
         unit_type = $3,
         bedrooms = $4,
         bathrooms = $5,
         status = $6,
         building_label = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      data.property_id,
      data.unit_number,
      data.unit_type,
      data.bedrooms,
      data.bathrooms,
      data.status,
      data.building_label ?? null,
      id,
    ]
  );
}
