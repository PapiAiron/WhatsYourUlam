import { CURRENCY_FRACTION_DIGITS } from '../constants/index.ts';
import type { CurrencyCode } from '../types/index.ts';

export function getCurrencyFractionDigits(currency: CurrencyCode): number {
  return CURRENCY_FRACTION_DIGITS[currency] ?? 2;
}

export function majorToMinor(major: number, currency: CurrencyCode): number {
  const digits = getCurrencyFractionDigits(currency);
  const factor = 10 ** digits;
  return Math.round(major * factor);
}

export function minorToMajor(minor: number, currency: CurrencyCode): number {
  const digits = getCurrencyFractionDigits(currency);
  const factor = 10 ** digits;
  return minor / factor;
}

export function formatMoney(
  minor: number,
  currency: CurrencyCode = 'PHP',
  locale: string = 'en-PH',
  options?: { compactDecimals?: boolean }
): string {
  const digits = getCurrencyFractionDigits(currency);
  const value = minorToMajor(Math.round(minor), currency);
  const isWhole = Math.round(minor) % 10 ** digits === 0;
  const maxDigits = digits;
  const minDigits = options?.compactDecimals && isWhole ? 0 : digits;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: minDigits,
    maximumFractionDigits: maxDigits,
  }).format(value);
}

export function formatMoneyWhole(
  minor: number,
  currency: CurrencyCode = 'PHP',
  locale: string = 'en-PH'
): string {
  return formatMoney(minor, currency, locale, { compactDecimals: true });
}

export function prorateMinor(
  usedQty: number,
  packSize: number,
  packPriceMinor: number
): number {
  if (packSize <= 0 || usedQty <= 0) return 0;
  return Math.round((usedQty * packPriceMinor) / packSize);
}

export function unitPricePerBaseMinor(
  packSize: number,
  packPriceMinor: number,
  baseUnitQty: number
): number {
  if (packSize <= 0) return 0;
  return Math.round((packPriceMinor * baseUnitQty) / packSize);
}
