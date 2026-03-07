import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(200),
});

export const updatePropertySchema = z.object({
  name: z.string().trim().min(1, 'Property name is required').max(200),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
