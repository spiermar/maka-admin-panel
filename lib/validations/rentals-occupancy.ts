import { z } from 'zod';

export const occupancyStatusSchema = z.enum(['Occupied', 'Vacant', 'Unavailable']);

const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Effective date must be in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: 'Effective date must be in YYYY-MM-DD format',
  });

const unavailableReasonSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const scheduleOccupancySchema = z
  .object({
    unit_id: z.coerce.number().int().positive('Unit is required'),
    status: occupancyStatusSchema,
    effective_date: dateOnlySchema,
    unavailable_reason: unavailableReasonSchema,
  })
  .superRefine((value, ctx) => {
    if (value.status !== 'Unavailable' && value.unavailable_reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unavailable_reason'],
        message: 'Unavailable reason can only be set when status is Unavailable',
      });
    }
  });

export type ScheduleOccupancyInput = z.infer<typeof scheduleOccupancySchema>;
