import { describe, it, expect } from 'vitest';
import { formatMoney, formatNumber, formatDate, getCountryName } from '../utils/formatters';

describe('formatters', () => {
  it('formats USD currency with dollar symbol and USD suffix', () => {
    const formatted = formatMoney(125000, 'USD');
    expect(formatted).toBe('$125,000.00 USD');
  });

  it('formats JPY with zero decimals', () => {
    const formatted = formatMoney(9500000, 'JPY');
    expect(formatted).toBe('¥9,500,000 JPY');
  });

  it('formats EUR and GBP correctly', () => {
    expect(formatMoney(85000.5, 'EUR')).toBe('€85,000.50 EUR');
    expect(formatMoney(72000, 'GBP')).toBe('£72,000.00 GBP');
  });

  it('handles null, undefined, or invalid inputs safely', () => {
    expect(formatMoney(null)).toBe('—');
    expect(formatMoney(undefined)).toBe('—');
    expect(formatMoney('invalid_amount')).toBe('—');
  });

  it('formats large employee headcounts with commas', () => {
    expect(formatNumber(10000)).toBe('10,000');
    expect(formatNumber(0)).toBe('0');
  });

  it('formats ISO dates accurately', () => {
    const dateFormatted = formatDate('2024-03-15');
    expect(dateFormatted).toContain('2024');
    expect(dateFormatted).toContain('Mar');
  });

  it('resolves ISO country codes to proper country names', () => {
    expect(getCountryName('US')).toBe('United States');
    expect(getCountryName('DE')).toBe('Germany');
    expect(getCountryName('JP')).toBe('Japan');
  });
});
