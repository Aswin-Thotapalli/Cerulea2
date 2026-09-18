// apps/frontend/src/lib/intent/match.ts
// Scores a catalogue entry against a plain-language description.
// The score counts the terms both sides share, weighted by the field the term
// sits in. A name carries more weight than a paragraph.
// The reason a user reads is the list of shared terms. Cerulea claims nothing
// the description did not say.

import { termSet, tokeniseWithSource } from './tokenise';

/** The weight of each field a term can appear in. */
export const FIELD_WEIGHTS = {
  name: 4,
  tag: 3,
  description: 2,
  category: 2,
  detail: 1,
} as const;

export type FieldName = keyof typeof FIELD_WEIGHTS;

/** One catalogue entry prepared for matching. */
export type ScorableDocument = {
  id: string;
  fields: Partial<Record<FieldName, Array<string | undefined | null>>>;
};

export type ScoredDocument = {
  id: string;
  score: number;
  /** The share of the description terms this entry answers, from 0 to 1. */
  coverage: number;
  /** The words we wrote that this entry answers. */
  matchedTerms: string[];
};

type PreparedDocument = {
  id: string;
  weightByTerm: Map<string, number>;
};

/** Builds the term index of one entry. A term keeps the highest weight it earns. */
export function prepareDocument(document: ScorableDocument): PreparedDocument {
  const weightByTerm = new Map<string, number>();
  for (const field of Object.keys(FIELD_WEIGHTS) as FieldName[]) {
    const parts = document.fields[field];
    if (!parts) continue;
    const weight = FIELD_WEIGHTS[field];
    for (const term of termSet(parts)) {
      const held = weightByTerm.get(term) ?? 0;
      if (weight > held) weightByTerm.set(term, weight);
    }
  }
  return { id: document.id, weightByTerm };
}

/**
 * Scores every entry against the description and returns the strongest first.
 * Entries that share no term are left out. Equal scores keep catalogue order by
 * identifier, so the same description always produces the same list.
 */
export function scoreDocuments(
  description: string,
  documents: ScorableDocument[],
  limit = 5,
): ScoredDocument[] {
  const terms = tokeniseWithSource(description);
  if (terms.length === 0) return [];

  const scored: ScoredDocument[] = [];
  for (const document of documents) {
    const prepared = prepareDocument(document);
    let score = 0;
    const matchedTerms: string[] = [];
    for (const { term, word } of terms) {
      const weight = prepared.weightByTerm.get(term);
      if (weight) {
        score += weight;
        matchedTerms.push(word);
      }
    }
    if (score === 0) continue;
    scored.push({
      id: document.id,
      score,
      coverage: matchedTerms.length / terms.length,
      matchedTerms,
    });
  }

  scored.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.matchedTerms.length !== left.matchedTerms.length) {
      return right.matchedTerms.length - left.matchedTerms.length;
    }
    return left.id.localeCompare(right.id);
  });

  return scored.slice(0, Math.max(0, limit));
}

/** Writes the shared terms as one sentence a non-technical reader understands. */
export function reasonFromTerms(matchedTerms: string[]): string {
  if (matchedTerms.length === 0) return 'Nothing in our description points here.';
  if (matchedTerms.length === 1) return `Our description mentions ${matchedTerms[0]}.`;
  const head = matchedTerms.slice(0, -1).join(', ');
  const tail = matchedTerms[matchedTerms.length - 1];
  return `Our description mentions ${head} and ${tail}.`;
}
