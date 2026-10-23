export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  DE: 'Germany',
  GB: 'United Kingdom',
  JP: 'Japan',
  CA: 'Canada',
  IN: 'India',
  AU: 'Australia',
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  INR: '₹',
  AUD: 'AU$',
};

export function formatMoney(amount: number | string | null | undefined, currency: string = 'USD'): string {
  if (amount === null || amount === undefined) {
    return '—';
  }
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    return '—';
  }

  const curr = currency.toUpperCase();
  const symbol = CURRENCY_SYMBOLS[curr] || '$';
  const isZeroDecimal = curr === 'JPY';

  const formattedValue = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(numericAmount);

  // Always append currency code to eliminate any symbol ambiguity (e.g. $ USD vs $ CAD vs $ AUD)
  return `${symbol}${formattedValue} ${curr}`;
}

export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d);
}

export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] || code;
}
