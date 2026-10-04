// apps/frontend/src/lib/intent/tokenise.ts
// Cuts plain language into the terms Cerulea matches on.
// The rule is fixed, so the same description always produces the same terms.
// Without this step a description and a catalogue entry never meet.

/** Words that carry no subject and therefore match nothing useful. */
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'all', 'also', 'and', 'any', 'are', 'because',
  'been', 'before', 'being', 'between', 'both', 'but', 'can', 'cannot', 'could',
  'did', 'does', 'each', 'every', 'for', 'from', 'get', 'had', 'has', 'have',
  'her', 'here', 'him', 'his', 'how', 'into', 'its', 'itself', 'just', 'like',
  'make', 'many', 'may', 'might', 'more', 'most', 'must', 'need', 'new', 'not',
  'now', 'off', 'once', 'one', 'only', 'other', 'our', 'out', 'over', 'own',
  'same', 'should', 'some', 'such', 'than', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'those', 'through', 'too', 'under',
  'until', 'use', 'used', 'using', 'very', 'want', 'was', 'way', 'were', 'what',
  'when', 'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would',
  'you', 'your',
]);

/**
 * Reduces a word to a stem, so plural and past forms meet their root.
 * The rule stays short on purpose. A longer rule changes results without notice.
 */
export function stem(word: string): string {
  let value = word;
  if (value.endsWith("'s")) value = value.slice(0, -2);
  if (value.length > 5 && value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.length > 5 && (value.endsWith('ses') || value.endsWith('ches') || value.endsWith('shes'))) {
    return value.slice(0, -2);
  }
  if (value.length > 5 && value.endsWith('ing')) return value.slice(0, -3);
  if (value.length > 4 && value.endsWith('ed')) return value.slice(0, -2);
  if (value.length > 3 && value.endsWith('s') && !value.endsWith('ss')) return value.slice(0, -1);
  return value;
}

/** Splits text into lowercase words of three letters or more. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((word) => word.length >= 3);
}

/** One term of a description, beside the word it came from. */
export type SourcedTerm = {
  /** The stem Cerulea matches on. */
  term: string;
  /** The word we wrote. Every reason a user reads uses this word. */
  word: string;
};

/** Produces the ordered, repeated-free term list beside the words they came from. */
export function tokeniseWithSource(text: string): SourcedTerm[] {
  const seen = new Set<string>();
  const terms: SourcedTerm[] = [];
  for (const word of words(text)) {
    if (STOP_WORDS.has(word)) continue;
    const term = stem(word);
    if (term.length < 3 || seen.has(term)) continue;
    seen.add(term);
    terms.push({ term, word });
  }
  return terms;
}

/** Produces the ordered, repeated-free term list Cerulea matches on. */
export function tokenise(text: string): string[] {
  return tokeniseWithSource(text).map((item) => item.term);
}

/** Produces the term set of a catalogue entry, with repeats removed. */
export function termSet(parts: Array<string | undefined | null>): Set<string> {
  const set = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    for (const term of tokenise(part)) set.add(term);
  }
  return set;
}
