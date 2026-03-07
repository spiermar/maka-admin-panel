import { beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { scheduleUnitOccupancyStatusAction } from '@/lib/actions/rentals';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('@/lib/db/rentals-occupancy', () => ({
  scheduleUnitOccupancyStatus: vi.fn(),
  OccupancyConflictError: class OccupancyConflictError extends Error {
    code = 'OCCUPANCY_OVERLAP';
  },
}));

describe('Rentals Occupancy Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks unauthenticated occupancy schedule calls', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('NEXT_REDIRECT: /login'));

    const formData = new FormData();
    formData.append('unit_id', '7');
    formData.append('status', 'Occupied');
    formData.append('effective_date', '2026-03-07');

    await expect(scheduleUnitOccupancyStatusAction(formData)).rejects.toThrow(
      'NEXT_REDIRECT: /login'
    );
  });

  it('accepts current-date occupancy schedule payloads', async () => {
    const { scheduleUnitOccupancyStatus } = await import('@/lib/db/rentals-occupancy');
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      username: 'admin',
      sessionVersion: 1,
    });
    vi.mocked(scheduleUnitOccupancyStatus).mockResolvedValue({
      id: 2,
      unit_id: 7,
      status: 'Occupied',
      effective_date: '2026-03-07',
      unavailable_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const formData = new FormData();
    formData.append('unit_id', '7');
    formData.append('status', 'Occupied');
    formData.append('effective_date', '2026-03-07');

    const result = await scheduleUnitOccupancyStatusAction(formData);

    expect(result).toEqual({ success: true });
    expect(scheduleUnitOccupancyStatus).toHaveBeenCalledWith({
      unit_id: 7,
      status: 'Occupied',
      effective_date: '2026-03-07',
      unavailable_reason: null,
    });
    expect(revalidatePath).toHaveBeenCalledWith('/rentals');
    expect(revalidatePath).toHaveBeenCalledWith('/rentals/units/7');
  });

  it('accepts future-date occupancy schedule payloads', async () => {
    const { scheduleUnitOccupancyStatus } = await import('@/lib/db/rentals-occupancy');
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      username: 'admin',
      sessionVersion: 1,
    });
    vi.mocked(scheduleUnitOccupancyStatus).mockResolvedValue({
      id: 3,
      unit_id: 5,
      status: 'Vacant',
      effective_date: '2026-04-01',
      unavailable_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const formData = new FormData();
    formData.append('unit_id', '5');
    formData.append('status', 'Vacant');
    formData.append('effective_date', '2026-04-01');

    const result = await scheduleUnitOccupancyStatusAction(formData);

    expect(result).toEqual({ success: true });
    expect(scheduleUnitOccupancyStatus).toHaveBeenCalledWith({
      unit_id: 5,
      status: 'Vacant',
      effective_date: '2026-04-01',
      unavailable_reason: null,
    });
  });

  it('returns explicit overlap error when schedule conflicts', async () => {
    const { scheduleUnitOccupancyStatus } = await import('@/lib/db/rentals-occupancy');
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      username: 'admin',
      sessionVersion: 1,
    });
    vi.mocked(scheduleUnitOccupancyStatus).mockRejectedValue(
      Object.assign(new Error('Conflict'), { code: 'OCCUPANCY_OVERLAP' })
    );

    const formData = new FormData();
    formData.append('unit_id', '5');
    formData.append('status', 'Vacant');
    formData.append('effective_date', '2026-04-01');

    const result = await scheduleUnitOccupancyStatusAction(formData);

    expect(result).toEqual({
      success: false,
      error:
        'An occupancy status is already scheduled for this unit on the selected effective date',
    });
  });
});
