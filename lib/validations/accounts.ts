import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100),
});

export type AccountInput = z.infer<typeof accountSchema>;
