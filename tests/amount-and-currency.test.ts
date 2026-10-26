import { describe, it, expect } from 'vitest';
import { dollarsToCents, centsToDollars, amountCentsSchema, currencySchema } from '../lib/validations';

describe('Amount Validation and Cents Conversion', () => {
  it('converts dollar amounts to integer cents accurately', () => {
    expect(dollarsToCents('150')).toBe(15000);
    expect(dollarsToCents('150.00')).toBe(15000);
    expect(dollarsToCents(150)).toBe(15000);
    expect(dollarsToCents('0.99')).toBe(99);
    expect(dollarsToCents('$150.50')).toBe(15050);
    expect(dollarsToCents('0')).toBe(0);
  });

  it('converts integer cents back to formatted dollar strings with two decimals', () => {
    expect(centsToDollars(15000)).toBe('150.00');
    expect(centsToDollars(99)).toBe('0.99');
    expect(centsToDollars(0)).toBe('0.00');
    expect(centsToDollars(123456)).toBe('1234.56');
  });

  it('validates amount in cents as a positive bounded integer using Zod', () => {
    expect(amountCentsSchema.safeParse(15000).success).toBe(true);
    expect(amountCentsSchema.safeParse(0).success).toBe(false);

    // Negative cents rejected
    const negativeResult = amountCentsSchema.safeParse(-500);
    expect(negativeResult.success).toBe(false);

    // Non-integer floats rejected
    const floatResult = amountCentsSchema.safeParse(150.5);
    expect(floatResult.success).toBe(false);
  });

  it('strictly enforces USD currency code for MVP', () => {
    expect(currencySchema.safeParse('USD').success).toBe(true);
    expect(currencySchema.safeParse('EUR').success).toBe(false);
    expect(currencySchema.safeParse('GBP').success).toBe(false);
  });
});
