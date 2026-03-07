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

export async function getUnitsByProperty(propertyId: number): Promise<Unit[]> {
  return queryMany<Unit>(
    'SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number ASC',
    [propertyId]
  );
}

export async function getUnitById(id: number): Promise<Unit | null> {
  return queryOne<Unit>('SELECT * FROM units WHERE id = $1', [id]);
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
