/**
 * Decimal-safe money calculations for ETB and other currencies.
 * All amounts stored as integer minor units internally during calculation.
 */

export interface MoneyBreakdown {
  currency: string;
  subtotal: number;
  serviceChargeRate: number;
  serviceChargeAmount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
}

export interface LinePriceInput {
  basePrice: number;
  quantity: number;
  modifierDeltas: number[];
}

const SCALE = 100;

function toMinor(units: number): number {
  return Math.round(units * SCALE);
}

function fromMinor(minor: number): number {
  return minor / SCALE;
}

function roundMoney(minor: number): number {
  return fromMinor(minor);
}

export function calculateLineTotal(input: LinePriceInput): number {
  const unitMinor =
    toMinor(input.basePrice) +
    input.modifierDeltas.reduce((sum, d) => sum + toMinor(d), 0);
  return roundMoney(unitMinor * input.quantity);
}

export function calculateOrderTotals(
  lineTotals: number[],
  serviceChargePercent: number,
  vatPercent: number,
  currency = 'ETB'
): MoneyBreakdown {
  const subtotalMinor = lineTotals.reduce((sum, t) => sum + toMinor(t), 0);
  const serviceChargeMinor = Math.round(subtotalMinor * (serviceChargePercent / 100));
  const taxableMinor = subtotalMinor + serviceChargeMinor;
  const vatMinor = Math.round(taxableMinor * (vatPercent / 100));
  const grandMinor = taxableMinor + vatMinor;

  return {
    currency,
    subtotal: roundMoney(subtotalMinor),
    serviceChargeRate: serviceChargePercent,
    serviceChargeAmount: roundMoney(serviceChargeMinor),
    vatRate: vatPercent,
    vatAmount: roundMoney(vatMinor),
    grandTotal: roundMoney(grandMinor),
  };
}

/** Format price for display — ETB defaults to whole numbers */
export function formatMoney(
  amount: number,
  currency = 'ETB',
  options?: { forceDecimals?: boolean }
): string {
  const useDecimals = options?.forceDecimals ?? currency !== 'ETB';
  const formatted = useDecimals
    ? amount.toFixed(2)
    : Math.round(amount).toString();
  return `${currency} ${formatted}`;
}

export function numberFromDecimal(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}
