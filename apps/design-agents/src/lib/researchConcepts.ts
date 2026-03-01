import { ResearchConcept } from '../types';

interface ResearchConceptsPayload {
  concepts: ResearchConcept[];
}

export const normalizeResearchConcepts = (payload: unknown): ResearchConceptsPayload => {
  if (Array.isArray(payload)) {
    return { concepts: payload as ResearchConcept[] };
  }

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { concepts?: unknown }).concepts)
  ) {
    return {
      concepts: (payload as { concepts: ResearchConcept[] }).concepts,
    };
  }

  return { concepts: [] };
};
