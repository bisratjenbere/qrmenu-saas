import { describe, it, expect } from 'vitest';
import {
  calculateLineTotal,
  calculateOrderTotals,
  formatMoney,
} from '@qrmenu/shared';

describe('Money calculations', () => {
  it('calculates line total with modifiers without float drift', () => {
    const total = calculateLineTotal({
      basePrice: 350,
      quantity: 2,
      modifierDeltas: [25, 40],
    });
    expect(total).toBe(830);
  });

  it('calculates order totals with service charge and VAT', () => {
    const result = calculateOrderTotals([380, 420], 10, 15, 'ETB');
    expect(result.subtotal).toBe(800);
    expect(result.serviceChargeAmount).toBe(80);
    expect(result.vatAmount).toBe(132);
    expect(result.grandTotal).toBe(1012);
  });

  it('formats ETB as whole numbers by default', () => {
    expect(formatMoney(380.5, 'ETB')).toBe('ETB 381');
    expect(formatMoney(380.5, 'USD', { forceDecimals: true })).toBe('USD 380.50');
  });
});
