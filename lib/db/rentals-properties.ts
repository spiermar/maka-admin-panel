import { execute, executeReturning, queryMany, queryOne } from './index';
import { Property } from './types';

export async function getAllProperties(): Promise<Property[]> {
  return queryMany<Property>('SELECT * FROM properties ORDER BY name ASC');
}

export async function getPropertyById(id: number): Promise<Property | null> {
  return queryOne<Property>('SELECT * FROM properties WHERE id = $1', [id]);
}

export async function createProperty(data: { name: string }): Promise<Property> {
  return executeReturning<Property>(
    'INSERT INTO properties (name) VALUES ($1) RETURNING *',
    [data.name]
  );
}

export async function updateProperty(
  id: number,
  data: { name: string }
): Promise<void> {
  await execute(
    'UPDATE properties SET name = $1, updated_at = NOW() WHERE id = $2',
    [data.name, id]
  );
}
