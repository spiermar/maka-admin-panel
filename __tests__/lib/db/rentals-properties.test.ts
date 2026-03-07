import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createProperty,
  getAllProperties,
  getPropertyById,
  updateProperty,
} from '@/lib/db/rentals-properties';

vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  executeReturning: vi.fn(),
  queryMany: vi.fn(),
  queryOne: vi.fn(),
}));

describe('Rentals Property Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists all properties ordered by name', async () => {
    const { queryMany } = await import('@/lib/db');
    const rows = [{ id: 1, name: 'Oak Villas' }];
    vi.mocked(queryMany).mockResolvedValue(rows);

    const result = await getAllProperties();

    expect(result).toEqual(rows);
    expect(queryMany).toHaveBeenCalledWith(
      'SELECT * FROM properties ORDER BY name ASC'
    );
  });

  it('gets a property by id', async () => {
    const { queryOne } = await import('@/lib/db');
    const row = { id: 7, name: 'Elm Court' };
    vi.mocked(queryOne).mockResolvedValue(row);

    const result = await getPropertyById(7);

    expect(result).toEqual(row);
    expect(queryOne).toHaveBeenCalledWith(
      'SELECT * FROM properties WHERE id = $1',
      [7]
    );
  });

  it('creates a property and returns row', async () => {
    const { executeReturning } = await import('@/lib/db');
    const row = { id: 2, name: 'Pine Homes' };
    vi.mocked(executeReturning).mockResolvedValue(row);

    const result = await createProperty({ name: 'Pine Homes' });

    expect(result).toEqual(row);
    expect(executeReturning).toHaveBeenCalledWith(
      'INSERT INTO properties (name) VALUES ($1) RETURNING *',
      ['Pine Homes']
    );
  });

  it('updates a property name and timestamp', async () => {
    const { execute } = await import('@/lib/db');

    await updateProperty(3, { name: 'Maple Point' });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE properties'),
      ['Maple Point', 3]
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('updated_at = NOW()'),
      ['Maple Point', 3]
    );
  });
});
