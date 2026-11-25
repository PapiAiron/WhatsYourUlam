import type { CanonicalUnit } from '../types/index.ts';

export function roundPracticalQty(qty: number, unit: CanonicalUnit): number {
  if (qty <= 0) return 0;
  if (unit === 'pc') {
    if (qty < 1) return Math.max(0.5, Math.round(qty * 2) / 2);
    return Math.round(qty * 2) / 2;
  }
  if (qty < 10) {
    return Math.max(2, Math.round(qty));
  }
  if (qty < 100) {
    return Math.max(5, Math.round(qty / 5) * 5);
  }
  if (qty < 500) {
    return Math.round(qty / 10) * 10;
  }
  return Math.round(qty / 25) * 25;
}

export function formatQty(
  qty: number,
  unit: CanonicalUnit,
  unitSystem: 'metric' | 'imperial' = 'metric'
): string {
  const rounded = Math.round(qty * 10) / 10;
  if (unit === 'pc') {
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} pc`;
  }
  if (unitSystem === 'imperial') {
    if (unit === 'g') {
      if (rounded >= 454) {
        return `${(rounded / 453.592).toFixed(2)} lb`;
      }
      return `${(rounded / 28.3495).toFixed(1)} oz`;
    }
    if (unit === 'ml') {
      return `${(rounded / 29.5735).toFixed(1)} fl oz`;
    }
  }
  if (unit === 'g' && rounded >= 1000) {
    const kg = rounded / 1000;
    return `${kg % 1 === 0 ? kg.toFixed(0) : kg.toFixed(2)} kg`;
  }
  if (unit === 'ml' && rounded >= 1000) {
    const l = rounded / 1000;
    return `${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
  }
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} ${unit}`;
}
