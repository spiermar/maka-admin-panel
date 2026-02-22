import { z } from 'zod';

const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
  .refine(
    (dateStr) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = Date.UTC(year, month - 1, day);
      const now = new Date();
      const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const minDateUTC = Date.UTC(now.getFullYear() - 10, 0, 1);
      return !isNaN(date) && date >= minDateUTC && date <= todayUTC;
    },
    { message: 'Date must be within last 10 years and not in the future' }
  );

const amountSchema = z.string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Invalid amount format')
  .refine(
    (amountStr) => {
      const amount = parseFloat(amountStr);
      return !isNaN(amount) && amount > 0 && amount <= 1000000;
    },
    { message: 'Amount must be between 0.01 and 1,000,000.00' }
  );

export const expenseReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
});

export const expenseSchema = z.object({
  transaction_id: z.coerce.number().optional(),
  payee: z.string().min(1, 'Payee is required').max(200),
  amount: amountSchema,
  date: dateSchema,
  category_id: z.coerce.number().nullable().optional(),
  memo: z.string().max(500).optional(),
});

export type ExpenseReportInput = z.infer<typeof expenseReportSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;