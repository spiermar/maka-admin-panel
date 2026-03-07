import { describe, expect, it } from 'vitest';
import { scheduleOccupancySchema } from '@/lib/validations/rentals-occupancy';

describe('Rentals Occupancy Validation', () => {
  it('accepts valid current-date occupancy transitions', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: '14',
      status: 'Occupied',
      effective_date: '2026-03-07',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unit_id).toBe(14);
      expect(result.data.status).toBe('Occupied');
      expect(result.data.effective_date).toBe('2026-03-07');
      expect(result.data.unavailable_reason).toBeNull();
    }
  });

  it('accepts valid future-date scheduling', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: 22,
      status: 'Vacant',
      effective_date: '2026-04-15',
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsupported status values', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: 1,
      status: 'Reserved',
      effective_date: '2026-03-07',
    });

    expect(result.success).toBe(false);
  });

  it('rejects malformed date values', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: 1,
      status: 'Vacant',
      effective_date: '03/07/2026',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.effective_date).toContain(
        'Effective date must be in YYYY-MM-DD format'
      );
    }
  });

  it('requires unavailable reason only for unavailable status', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: 1,
      status: 'Occupied',
      effective_date: '2026-03-07',
      unavailable_reason: 'Renovation',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.unavailable_reason).toContain(
        'Unavailable reason can only be set when status is Unavailable'
      );
    }
  });

  it('accepts unavailable reason when status is unavailable', () => {
    const result = scheduleOccupancySchema.safeParse({
      unit_id: 1,
      status: 'Unavailable',
      effective_date: '2026-03-07',
      unavailable_reason: 'Major repairs',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.unavailable_reason).toBe('Major repairs');
    }
  });
});
