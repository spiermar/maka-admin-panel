import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OccupancyConflictError,
  getUnitOccupancySnapshot,
  scheduleUnitOccupancyStatus,
} from '@/lib/db/rentals-occupancy';

vi.mock('@/lib/db', () => ({
  execute: vi.fn(),
  executeReturning: vi.fn(),
  queryOne: vi.fn(),
}));

describe('Rentals Occupancy Queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves current and next statuses using date-only CURRENT_DATE semantics', async () => {
    const { queryOne } = await import('@/lib/db');

    vi.mocked(queryOne)
      .mockResolvedValueOnce({
        status: 'Occupied',
        effective_date: '2026-03-01',
        unavailable_reason: null,
      })
      .mockResolvedValueOnce({
        status: 'Vacant',
        effective_date: '2026-04-01',
        unavailable_reason: null,
      });

    const result = await getUnitOccupancySnapshot(12);

    expect(result.current).toEqual({
      status: 'Occupied',
      effective_date: '2026-03-01',
      unavailable_reason: null,
    });
    expect(result.next).toEqual({
      status: 'Vacant',
      effective_date: '2026-04-01',
      unavailable_reason: null,
    });
    expect(queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('effective_date <= CURRENT_DATE'),
      [12]
    );
    expect(queryOne).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('effective_date > CURRENT_DATE'),
      [12]
    );
  });

  it('inserts occupancy status when no overlap exists', async () => {
    const { queryOne, executeReturning, execute } = await import('@/lib/db');
    vi.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'Occupied' });
    vi.mocked(executeReturning).mockResolvedValue({
      id: 5,
      unit_id: 9,
      status: 'Unavailable',
      effective_date: '2026-04-15',
      unavailable_reason: 'Renovation',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await scheduleUnitOccupancyStatus({
      unit_id: 9,
      status: 'Unavailable',
      effective_date: '2026-04-15',
      unavailable_reason: 'Renovation',
    });

    expect(result.status).toBe('Unavailable');
    expect(queryOne).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('effective_date = $2::date'),
      [9, '2026-04-15']
    );
    expect(executeReturning).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO unit_occupancy_statuses'),
      [9, 'Unavailable', '2026-04-15', 'Renovation']
    );
    expect(execute).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE units'),
      [9]
    );
  });

  it('normalizes blank unavailable reason to null', async () => {
    const { queryOne, executeReturning } = await import('@/lib/db');
    vi.mocked(queryOne)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: 'Vacant' });
    vi.mocked(executeReturning).mockResolvedValue({
      id: 8,
      unit_id: 2,
      status: 'Unavailable',
      effective_date: '2026-05-01',
      unavailable_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await scheduleUnitOccupancyStatus({
      unit_id: 2,
      status: 'Unavailable',
      effective_date: '2026-05-01',
      unavailable_reason: '  ',
    });

    expect(executeReturning).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO unit_occupancy_statuses'),
      [2, 'Unavailable', '2026-05-01', null]
    );
  });

  it('rejects overlapping scheduled status for same effective date', async () => {
    const { queryOne } = await import('@/lib/db');
    vi.mocked(queryOne).mockResolvedValueOnce({ id: 33 });

    await expect(
      scheduleUnitOccupancyStatus({
        unit_id: 3,
        status: 'Occupied',
        effective_date: '2026-04-01',
      })
    ).rejects.toBeInstanceOf(OccupancyConflictError);
  });
});
