import { z } from 'zod';

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: 'Invalid date format',
  });

export const chargeStatusSchema = z.enum(['pending', 'paid']);

export const createChargeSchema = z.object({
  lease_id: z.coerce.number().int().positive('Lease is required'),
  charge_date: dateOnlySchema,
  due_date: dateOnlySchema,
  amount: z.coerce.number().positive('Amount must be positive'),
  status: chargeStatusSchema.optional().default('pending'),
}).refine(data => new Date(data.due_date) >= new Date(data.charge_date), {
  message: 'Due date must be on or after charge date',
  path: ['due_date'],
});

export const updateChargeSchema = z.object({
  lease_id: z.coerce.number().int().positive('Lease is required').optional(),
  charge_date: dateOnlySchema.optional(),
  due_date: dateOnlySchema.optional(),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  status: chargeStatusSchema.optional(),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
export type UpdateChargeInput = z.infer<typeof updateChargeSchema>;