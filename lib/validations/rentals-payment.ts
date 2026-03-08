import { z } from 'zod';

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: 'Invalid date format',
  });

export const paymentMethodSchema = z.enum(['cash', 'check', 'bank_transfer', 'other']);

export const createPaymentSchema = z.object({
  lease_id: z.coerce.number().int().positive('Lease is required'),
  payment_date: dateOnlySchema,
  amount: z.coerce.number().positive('Amount must be positive'),
  payment_method: paymentMethodSchema,
  notes: z.string().max(1000).optional(),
});

export const updatePaymentSchema = z.object({
  lease_id: z.coerce.number().int().positive('Lease is required').optional(),
  payment_date: dateOnlySchema.optional(),
  amount: z.coerce.number().positive('Amount must be positive').optional(),
  payment_method: paymentMethodSchema.optional(),
  notes: z.string().max(1000).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;