import { describe, expect, it } from 'vitest';
import {
  createUnitSchema,
  updateUnitSchema,
} from '@/lib/validations/rentals-unit';

describe('Rentals Unit Validation', () => {
  it('accepts valid required core unit fields with optional building label', () => {
    const result = createUnitSchema.safeParse({
      property_id: '3',
      unit_number: '301',
      unit_type: 'Apartment',
      bedrooms: '2',
      bathrooms: '1.5',
      status: 'Vacant',
      building_label: 'North Wing',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.property_id).toBe(3);
      expect(result.data.status).toBe('Vacant');
      expect(result.data.building_label).toBe('North Wing');
    }
  });

  it('requires core unit fields', () => {
    const result = createUnitSchema.safeParse({
      property_id: '',
      unit_number: '',
      unit_type: '',
      bedrooms: '',
      bathrooms: '',
      status: '',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.property_id).toBeTruthy();
      expect(fields.unit_number).toBeTruthy();
      expect(fields.unit_type).toBeTruthy();
      expect(fields.bedrooms).toBeTruthy();
      expect(fields.bathrooms).toBeTruthy();
      expect(fields.status).toBeTruthy();
    }
  });

  it('rejects unsupported status values', () => {
    const result = createUnitSchema.safeParse({
      property_id: 1,
      unit_number: '101',
      unit_type: 'Apartment',
      bedrooms: 1,
      bathrooms: 1,
      status: 'Reserved',
    });

    expect(result.success).toBe(false);
  });

  it('allows partial updates with valid fields', () => {
    const result = updateUnitSchema.safeParse({
      bathrooms: '2',
      building_label: 'Tower A',
      status: 'Occupied',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bathrooms).toBe(2);
      expect(result.data.status).toBe('Occupied');
      expect(result.data.building_label).toBe('Tower A');
    }
  });
});
