import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
});

export const updateTenantSchema = createTenantSchema.partial();

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;