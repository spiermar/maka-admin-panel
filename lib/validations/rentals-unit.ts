import { z } from 'zod';

export const unitStatusSchema = z.enum(['Occupied', 'Vacant', 'Unavailable']);

const buildingLabelSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const requiredNonNegativeNumber = (fieldName: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || value === undefined) {
        return undefined;
      }
      return value;
    },
    z.coerce.number({
      error: `${fieldName} is required`,
    }).min(0, `${fieldName} must be 0 or greater`)
  );

const unitCreateShape = {
  property_id: z.coerce.number().int().positive('Property is required'),
  unit_number: z.string().trim().min(1, 'Unit number is required').max(50),
  unit_type: z.string().trim().min(1, 'Unit type is required').max(100),
  bedrooms: requiredNonNegativeNumber('Bedrooms'),
  bathrooms: requiredNonNegativeNumber('Bathrooms'),
  status: unitStatusSchema,
  building_label: buildingLabelSchema,
};

export const createUnitSchema = z.object(unitCreateShape);

export const updateUnitSchema = z.object({
  property_id: unitCreateShape.property_id.optional(),
  unit_number: unitCreateShape.unit_number.optional(),
  unit_type: unitCreateShape.unit_type.optional(),
  bedrooms: unitCreateShape.bedrooms.optional(),
  bathrooms: unitCreateShape.bathrooms.optional(),
  status: unitCreateShape.status.optional(),
  building_label: buildingLabelSchema.optional(),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
