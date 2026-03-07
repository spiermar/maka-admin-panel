import { z } from 'zod';

export const leaseStatusSchema = z.enum(['Draft', 'Pending', 'Active', 'Expired', 'Terminated']);

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: 'Invalid date format',
  });

export const createLeaseSchema = z.object({
  tenant_id: z.coerce.number().int().positive('Tenant is required'),
  unit_id: z.coerce.number().int().positive('Unit is required'),
  start_date: dateOnlySchema,
  end_date: dateOnlySchema,
  monthly_rent: z.coerce.number().positive('Rent must be positive'),
  security_deposit: z.coerce.number().min(0, 'Deposit cannot be negative'),
  lease_type: z.string().max(50).optional(),
  pets_allowed: z.boolean().optional(),
  parking_spot: z.string().max(100).optional(),
  utilities_included: z.boolean().optional(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: 'End date must be after start date',
  path: ['end_date'],
});

export const updateLeaseSchema = createLeaseSchema.partial();
export const transitionLeaseSchema = z.object({
  status: leaseStatusSchema,
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;
export type TransitionLeaseInput = z.infer<typeof transitionLeaseSchema>;