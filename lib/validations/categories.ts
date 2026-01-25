import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  category_type: z.enum(['income', 'expense'], {
    required_error: 'Category type is required',
  }),
  parent_id: z.coerce.number().nullable().optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
