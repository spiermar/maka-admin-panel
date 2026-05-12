type CurrencyAmount = string | number;
type DateValue = string | Date;

export function getCurrencyForLocale(locale: string): 'BRL' | 'USD' {
  return locale === 'pt-BR' ? 'BRL' : 'USD';
}

export function formatCurrency(amount: CurrencyAmount, locale: string): string {
  const numericAmount =
    typeof amount === 'number' ? amount : Number.parseFloat(amount);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: getCurrencyForLocale(locale),
  }).format(numericAmount);
}

export function formatDate(
  date: DateValue,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(locale, options).format(toDate(date));
}

function toDate(date: DateValue): Date {
  if (date instanceof Date) {
    return date;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dateOnlyMatch) {
    return new Date(date);
  }

  const [, year, month, day] = dateOnlyMatch;
  return new Date(Number(year), Number(month) - 1, Number(day));
}
