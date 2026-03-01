import { describe, expect, it } from 'vitest';
import { normalizeResearchConcepts } from './researchConcepts';

describe('normalizeResearchConcepts', () => {
  it('returns concepts from wrapped payload when concepts is an array', () => {
    const result = normalizeResearchConcepts({ concepts: [{ name: 'A' }] });
    expect(result).toEqual({ concepts: [{ name: 'A' }] });
  });

  it('wraps a raw concepts array payload', () => {
    const result = normalizeResearchConcepts([{ name: 'B' }]);
    expect(result).toEqual({ concepts: [{ name: 'B' }] });
  });

  it('returns empty concepts when payload shape is invalid', () => {
    const result = normalizeResearchConcepts({ concepts: { name: 'C' } });
    expect(result).toEqual({ concepts: [] });
  });
});
