import { z } from 'zod';

export const transactionSchema = z.object({
  account_id: z.coerce.number().positive('Account is required'),
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(
      (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const minDate = new Date(now.getFullYear() - 10, 0, 1);

        return !isNaN(date.getTime())
          && date >= minDate
          && date <= now;
      },
      {
        message: 'Date must be within last 10 years and not in the future'
      }
    ),
  payee: z.string().min(1, 'Payee is required').max(200),
  category_id: z.coerce.number().nullable().optional(),
  amount: z.string()
    .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .refine(
      (amountStr) => {
        const amount = parseFloat(amountStr);
        return !isNaN(amount)
          && amount >= -1000000
          && amount <= 1000000;
      },
      {
        message: 'Amount must be between -1,000,000.00 and 1,000,000.00'
      }
    ),
  comment: z.string().max(1000).optional(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
