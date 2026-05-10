import { describe, expect, it } from 'vitest';
import { parseTransactionFilters } from '@/lib/transactions/filters';

describe('parseTransactionFilters', () => {
  it('parses valid transaction filter query params', () => {
    const result = parseTransactionFilters({
      accountId: '2',
      categoryId: '7',
      from: '2026-05-01',
      to: '2026-05-31',
      q: ' rent ',
      lang: 'pt-BR',
    });

    expect(result).toEqual({
      filters: {
        accountId: 2,
        categoryId: 7,
        from: '2026-05-01',
        to: '2026-05-31',
        q: 'rent',
      },
      lang: 'pt-BR',
      hasInvalidDateRange: false,
    });
  });

  it('ignores invalid numeric and date values', () => {
    const result = parseTransactionFilters({
      accountId: 'abc',
      categoryId: '-1',
      from: '05/01/2026',
      to: 'not-a-date',
      q: '   ',
      lang: 'fr',
    });

    expect(result).toEqual({
      filters: {},
      lang: 'en',
      hasInvalidDateRange: false,
    });
  });

  it('ignores partially invalid numeric values', () => {
    const result = parseTransactionFilters({
      accountId: '2abc',
      categoryId: '1.5',
    });

    expect(result).toEqual({
      filters: {},
      lang: 'en',
      hasInvalidDateRange: false,
    });
  });

  it('ignores numeric values outside the PostgreSQL integer range', () => {
    const result = parseTransactionFilters({
      accountId: '2147483648',
      categoryId: '9007199254740993',
    });

    expect(result).toEqual({
      filters: {},
      lang: 'en',
      hasInvalidDateRange: false,
    });
  });

  it('ignores invalid calendar dates', () => {
    const result = parseTransactionFilters({
      from: '2026-02-31',
      to: '2026-04-31',
    });

    expect(result).toEqual({
      filters: {},
      lang: 'en',
      hasInvalidDateRange: false,
    });
  });

  it('marks valid reversed date ranges for empty result rendering', () => {
    const result = parseTransactionFilters({
      from: '2026-05-31',
      to: '2026-05-01',
    });

    expect(result).toEqual({
      filters: {
        from: '2026-05-31',
        to: '2026-05-01',
      },
      lang: 'en',
      hasInvalidDateRange: true,
    });
  });

  it('uses the first string when Next passes an array query value', () => {
    const result = parseTransactionFilters({
      accountId: ['4', '5'],
      q: ['office', 'ignored'],
    });

    expect(result.filters).toEqual({
      accountId: 4,
      q: 'office',
    });
  });
});
