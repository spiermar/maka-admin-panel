import { z } from 'zod';

export const transactionSchema = z.object({
  account_id: z.coerce.number().positive('Account is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  payee: z.string().min(1, 'Payee is required').max(200),
  category_id: z.coerce.number().nullable().optional(),
  amount: z.string().regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount'),
  comment: z.string().max(1000).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
