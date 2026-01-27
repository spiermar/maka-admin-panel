import { transactionSchema } from '@/lib/validations/transactions';
import { describe, it, expect } from 'vitest';

describe('Transaction Validation Schema', () => {
  describe('Amount Validation', () => {
    it('accepts amount at upper limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '1000000.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects amount exceeding upper limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '1000000.01',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('1,000,000');
    });

    it('accepts amount at lower limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '-1000000.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects amount below lower limit', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '-1000000.01',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('1,000,000');
    });

    it('accepts typical transaction amounts', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: '150.50',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid amount format', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '2026-01-26',
        payee: 'Test',
        amount: 'abc',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('Invalid amount format');
    });
  });

  describe('Date Validation', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const minDate = new Date(today.getFullYear() - 10, 0, 1);
    const tenYearsAgoStr = minDate.toISOString().split('T')[0];
    const tenYearsAndOneDayAgoStr = new Date(minDate.getTime() - 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    it('accepts today\'s date', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: todayStr,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects future date', () => {
      const future = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const result = transactionSchema.safeParse({
        account_id: 1,
        date: future,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('future');
    });

    it('accepts date exactly 10 years ago', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: tenYearsAgoStr,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects date older than 10 years', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: tenYearsAndOneDayAgoStr,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('10 years');
    });

    it('accepts recent dates', () => {
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const result = transactionSchema.safeParse({
        account_id: 1,
        date: lastWeek,
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: '01-26-2026',
        payee: 'Test',
        amount: '100.00',
      });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toContain('YYYY-MM-DD');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('shows all validation errors when multiple fields invalid', () => {
      const result = transactionSchema.safeParse({
        account_id: 1,
        date: 'future-date',
        payee: 'Test',
        amount: 'invalid',
      });

      expect(result.success).toBe(false);
      const errors = result.error?.flatten().fieldErrors;
      expect(errors?.date).toBeDefined();
      expect(errors?.amount).toBeDefined();
    });
  });

  describe('Complete Valid Transaction', () => {
    it('accepts fully valid transaction with all fields', () => {
      const today = new Date().toISOString().split('T')[0];

      const result = transactionSchema.safeParse({
        account_id: 1,
        date: today,
        payee: 'Test Payee',
        category_id: 2,
        amount: '123.45',
        comment: 'Test comment',
      });

      expect(result.success).toBe(true);
    });
  });
});
