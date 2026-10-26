import { describe, it, expect } from 'vitest';
import { verifyCitations } from '../lib/ai/citation-verifier';
import { DEMO_AGREEMENT_TEXT } from '../lib/db/memory-store';

describe('Grounded Citation Verification', () => {
  it('confirms citations that exist word-for-word in the contract text', () => {
    const validCitations = [
      'Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.',
      'The project fee includes up to two (2) consolidated rounds of design and content revisions prior to final launch.',
      'Functional contact inquiry form delivering email submissions via SMTP.',
    ];

    const result = verifyCitations(validCitations, DEMO_AGREEMENT_TEXT);
    expect(result.allVerified).toBe(true);
    expect(result.verifiedCount).toBe(3);
    expect(result.unverifiedCitations).toHaveLength(0);
  });

  it('detects and flags hallucinated or unmentioned contract citations', () => {
    const invalidCitations = [
      'The client may request unlimited revisions at no additional cost.',
      'Freelancer will provide 24/7 on-call phone support.',
    ];

    const result = verifyCitations(invalidCitations, DEMO_AGREEMENT_TEXT);
    expect(result.allVerified).toBe(false);
    expect(result.unverifiedCitations).toContain(
      'The client may request unlimited revisions at no additional cost.'
    );
    expect(result.unverifiedCitations).toContain(
      'Freelancer will provide 24/7 on-call phone support.'
    );
  });

  it('handles mixed valid and invalid citations accurately', () => {
    const mixed = [
      'Functional contact inquiry form delivering email submissions via SMTP.',
      'Client will pay in cryptocurrency.',
    ];

    const result = verifyCitations(mixed, DEMO_AGREEMENT_TEXT);
    expect(result.allVerified).toBe(false);
    expect(result.verifiedCount).toBe(1);
    expect(result.unverifiedCitations).toEqual(['Client will pay in cryptocurrency.']);
  });

  it('normalizes curly quotes, casing, and whitespace without compromising grounding', () => {
    const quoteWithCurlyQuotes =
      '“Direct booking, appointment scheduling, or calendar integration functionality is strictly excluded from this phase.”';

    const result = verifyCitations([quoteWithCurlyQuotes], DEMO_AGREEMENT_TEXT);
    expect(result.allVerified).toBe(true);
  });
});
