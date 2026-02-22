import { describe, it, expect, vi } from 'vitest';
import { expenseReportSchema, expenseSchema } from '@/lib/validations/expense-reports';

vi.mock('@/lib/db/expense-reports', () => ({
  getExpenseReports: vi.fn(),
  getExpenseReportById: vi.fn(),
  createExpenseReport: vi.fn(),
  updateExpenseReport: vi.fn(),
  submitExpenseReport: vi.fn(),
  approveExpenseReport: vi.fn(),
  rejectExpenseReport: vi.fn(),
  getExpensesByReport: vi.fn(),
  addExpense: vi.fn(),
  updateExpense: vi.fn(),
  deleteExpense: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe('Expense Reports Validation', () => {
  describe('expenseReportSchema', () => {
    it('validates a valid expense report', () => {
      const result = expenseReportSchema.safeParse({
        title: 'January 2025 Expenses',
        description: 'Monthly expense report',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty title', () => {
      const result = expenseReportSchema.safeParse({
        title: '',
        description: 'Test',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.title).toBeDefined();
      }
    });

    it('rejects title over 200 characters', () => {
      const result = expenseReportSchema.safeParse({
        title: 'a'.repeat(201),
        description: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects description over 1000 characters', () => {
      const result = expenseReportSchema.safeParse({
        title: 'Test',
        description: 'a'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });

    it('allows optional description', () => {
      const result = expenseReportSchema.safeParse({
        title: 'Test Report',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('expenseSchema', () => {
    it('validates a valid expense', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Grocery Store',
        amount: '150.00',
        date: today,
        category_id: 1,
        memo: 'Weekly groceries',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty payee', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: '',
        amount: '50.00',
        date: today,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid amount format', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: 'abc',
        date: today,
      });
      expect(result.success).toBe(false);
    });

    it('rejects negative amount', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '-50.00',
        date: today,
      });
      expect(result.success).toBe(false);
    });

    it('rejects amount over 1,000,000', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '1000001.00',
        date: today,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid date format', () => {
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: '01/01/2025',
      });
      expect(result.success).toBe(false);
    });

    it('rejects future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: futureDateStr,
      });
      expect(result.success).toBe(false);
    });

    it('rejects date older than 10 years', () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 11);
      const oldDateStr = oldDate.toISOString().split('T')[0];
      
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: oldDateStr,
      });
      expect(result.success).toBe(false);
    });

    it('allows memo to be optional', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: today,
      });
      expect(result.success).toBe(true);
    });

    it('allows category_id to be null', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: today,
        category_id: null,
      });
      expect(result.success).toBe(true);
    });

    it('allows transaction_id to be optional', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = expenseSchema.safeParse({
        payee: 'Test',
        amount: '50.00',
        date: today,
      });
      expect(result.success).toBe(true);
    });
  });
});