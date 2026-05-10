import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  parseAnalysisFilters,
  resolveAnalysisDateRange,
  resolveAnalysisGrouping,
} from '@/lib/analysis/filters';

describe('analysis filters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('parseAnalysisFilters', () => {
    it('uses last-3-months defaults with all accounts, all categories, adaptive grouping, and uncategorized included', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({});

      expect(result).toEqual({
        preset: 'last-3-months',
        from: '2026-02-10',
        to: '2026-05-10',
        grouping: 'adaptive',
        resolvedGrouping: 'weekly',
        includedCategoryIds: [],
        hasCategoryFilter: false,
        includeUncategorizedIncome: true,
        includeUncategorizedExpense: true,
        hasInvalidDateRange: false,
      });
    });

    it('parses a valid custom date range', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        preset: 'custom',
        from: '2026-01-15',
        to: '2026-04-20',
      });

      expect(result).toEqual(
        expect.objectContaining({
          preset: 'custom',
          from: '2026-01-15',
          to: '2026-04-20',
          hasInvalidDateRange: false,
        })
      );
    });

    it('keeps reversed custom dates and marks the range invalid', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        preset: 'custom',
        from: '2026-04-20',
        to: '2026-01-15',
      });

      expect(result).toEqual(
        expect.objectContaining({
          preset: 'custom',
          from: '2026-04-20',
          to: '2026-01-15',
          hasInvalidDateRange: true,
        })
      );
    });

    it('falls back from custom to last-3-months when a custom date is missing', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        preset: 'custom',
        from: '2026-01-15',
      });

      expect(result).toEqual(
        expect.objectContaining({
          preset: 'last-3-months',
          from: '2026-02-10',
          to: '2026-05-10',
          hasInvalidDateRange: false,
        })
      );
    });

    it('parses valid account, category, grouping, and uncategorized params', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        accountId: '4',
        categories: ['7', '3', '7', '2'],
        grouping: 'monthly',
        uncategorizedIncome: 'false',
        uncategorizedExpense: '0',
      });

      expect(result).toEqual(
        expect.objectContaining({
          accountId: 4,
          grouping: 'monthly',
          resolvedGrouping: 'monthly',
          includedCategoryIds: [2, 3, 7],
          hasCategoryFilter: true,
          includeUncategorizedIncome: false,
          includeUncategorizedExpense: false,
        })
      );
    });

    it('ignores malformed IDs and falls back from unknown grouping', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        accountId: '2abc',
        categories: ['abc', '-1', '0', '2147483648', '1.5'],
        grouping: 'yearly',
      });

      expect(result).toEqual(
        expect.objectContaining({
          grouping: 'adaptive',
          resolvedGrouping: 'weekly',
          includedCategoryIds: [],
          hasCategoryFilter: true,
        })
      );
      expect(result).not.toHaveProperty('accountId');
    });

    it('defaults malformed uncategorized params to included', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      const result = parseAnalysisFilters({
        uncategorizedIncome: 'no',
        uncategorizedExpense: 'yes',
      });

      expect(result.includeUncategorizedIncome).toBe(true);
      expect(result.includeUncategorizedExpense).toBe(true);
    });
  });

  describe('resolveAnalysisDateRange', () => {
    it('resolves this-month, last-month, and last-year presets in UTC', () => {
      vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

      expect(resolveAnalysisDateRange({ preset: 'this-month' })).toEqual({
        preset: 'this-month',
        from: '2026-05-01',
        to: '2026-05-10',
        hasInvalidDateRange: false,
      });
      expect(resolveAnalysisDateRange({ preset: 'last-month' })).toEqual({
        preset: 'last-month',
        from: '2026-04-01',
        to: '2026-04-30',
        hasInvalidDateRange: false,
      });
      expect(resolveAnalysisDateRange({ preset: 'last-year' })).toEqual({
        preset: 'last-year',
        from: '2025-01-01',
        to: '2025-12-31',
        hasInvalidDateRange: false,
      });
    });
  });

  describe('resolveAnalysisGrouping', () => {
    it('resolves adaptive grouping by inclusive range length thresholds', () => {
      expect(resolveAnalysisGrouping('adaptive', '2026-01-01', '2026-02-14')).toBe('daily');
      expect(resolveAnalysisGrouping('adaptive', '2026-01-01', '2026-02-15')).toBe('weekly');
      expect(resolveAnalysisGrouping('adaptive', '2026-01-01', '2026-06-29')).toBe('weekly');
      expect(resolveAnalysisGrouping('adaptive', '2026-01-01', '2026-06-30')).toBe('monthly');
    });

    it('resolves explicit grouping to itself', () => {
      expect(resolveAnalysisGrouping('daily', '2026-01-01', '2026-12-31')).toBe('daily');
      expect(resolveAnalysisGrouping('weekly', '2026-01-01', '2026-01-02')).toBe('weekly');
      expect(resolveAnalysisGrouping('monthly', '2026-01-01', '2026-01-02')).toBe('monthly');
    });
  });
});
