import { formatCurrency, formatDate } from '@/lib/i18n/format';

describe('i18n format utilities', () => {
  it('formats currency using USD for English locale', () => {
    expect(formatCurrency('1234.56', 'en')).toBe('$1,234.56');
  });

  it('formats currency using BRL for Brazilian Portuguese locale', () => {
    expect(formatCurrency('-1234.56', 'pt-BR')).toBe('-R$\u00a01.234,56');
  });

  it('formats date-only strings without shifting the calendar day', () => {
    expect(
      formatDate('2024-01-15', 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    ).toBe('Jan 15, 2024');
  });
});
