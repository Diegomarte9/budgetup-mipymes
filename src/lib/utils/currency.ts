/**
 * Currency formatting utilities for Dominican Peso (DOP)
 * Optimized for MiPymes in Dominican Republic
 */

// Format currency in Dominican Peso (DOP)
export function formatCurrency(amount: number, currency: string = 'DOP'): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format currency without symbol (for inputs)
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat('es-DO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Parse currency string to number
export function parseCurrency(value: string): number {
  // Remove currency symbols, spaces, and commas
  const cleanValue = value.replace(/[RD$,\s]/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('es-DO', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

// Format large numbers with K, M suffixes
export function formatCompactCurrency(amount: number, currency: string = 'DOP'): string {
  const formatter = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency,
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  
  return formatter.format(amount);
}

// Get currency symbol
export function getCurrencySymbol(currency: string = 'DOP'): string {
  const symbols: Record<string, string> = {
    DOP: 'RD$',
    USD: '$',
    EUR: '€',
  };
  
  return symbols[currency] || currency;
}

// Validate currency amount (for forms)
export function isValidCurrencyAmount(value: string | number): boolean {
  const num = typeof value === 'string' ? parseCurrency(value) : value;
  return !isNaN(num) && num >= 0 && num <= 999999999999.99;
}

// Format change percentage with color indication
export function formatChangePercentage(value: number): {
  formatted: string;
  color: 'positive' | 'negative' | 'neutral';
  symbol: string;
} {
  const formatted = formatPercentage(Math.abs(value));
  
  if (value > 0) {
    return { formatted, color: 'positive', symbol: '+' };
  } else if (value < 0) {
    return { formatted, color: 'negative', symbol: '-' };
  } else {
    return { formatted: '0%', color: 'neutral', symbol: '' };
  }
}