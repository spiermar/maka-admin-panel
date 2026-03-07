import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createUnit,
  getUnitById,
  getUnitsByProperty,
  updateUnit,
} from '@/lib/db/rentals-units';

vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  executeReturning: vi.fn(),
  queryMany: vi.fn(),
  queryOne: vi.fn(),
}));

describe('Rentals Unit Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists units by property ordered by unit number', async () => {
    const { queryMany } = await import('@/lib/db');
    const rows = [{ id: 1, property_id: 10, unit_number: '101' }];
    vi.mocked(queryMany).mockResolvedValue(rows);

    const result = await getUnitsByProperty(10);

    expect(result).toEqual(rows);
    expect(queryMany).toHaveBeenCalledWith(
      'SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number ASC',
      [10]
    );
  });

  it('gets a unit by id', async () => {
    const { queryOne } = await import('@/lib/db');
    const row = { id: 9, property_id: 2, unit_number: '2A' };
    vi.mocked(queryOne).mockResolvedValue(row);

    const result = await getUnitById(9);

    expect(result).toEqual(row);
    expect(queryOne).toHaveBeenCalledWith(
      'SELECT * FROM units WHERE id = $1',
      [9]
    );
  });

  it('creates a unit with optional building label', async () => {
    const { executeReturning } = await import('@/lib/db');
    const row = { id: 4, property_id: 3, unit_number: '303' };
    vi.mocked(executeReturning).mockResolvedValue(row);

    const result = await createUnit({
      property_id: 3,
      unit_number: '303',
      unit_type: 'Apartment',
      bedrooms: 2,
      bathrooms: 1.5,
      status: 'Vacant',
      building_label: 'Building B',
    });

    expect(result).toEqual(row);
    expect(executeReturning).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO units'),
      [3, '303', 'Apartment', 2, 1.5, 'Vacant', 'Building B']
    );
  });

  it('updates a unit and timestamp', async () => {
    const { execute } = await import('@/lib/db');

    await updateUnit(11, {
      property_id: 5,
      unit_number: '5C',
      unit_type: 'Condo',
      bedrooms: 3,
      bathrooms: 2,
      status: 'Occupied',
      building_label: null,
    });

    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE units'),
      [5, '5C', 'Condo', 3, 2, 'Occupied', null, 11]
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('updated_at = NOW()'),
      [5, '5C', 'Condo', 3, 2, 'Occupied', null, 11]
    );
  });
});
