// apps/frontend/src/lib/messages/catalogue.ts
// The message catalogue every Studio screen reads.
//
// A string a person reads lives in the catalogue rather than inside a
// component, so a translator works on one file and a screen reads whichever
// language a person chose. English ships with the build. Another language
// ships as a second file beside it.
//
// scripts/extract-messages.mjs writes the English file from the sources, and
// the gate test reads the same sources and fails where a string is absent, so
// a string added later reaches the catalogue before it reaches a person.
//
// Without the catalogue every screen would hold its own words and no
// translator could reach them.

import english from '@/messages/en.json';

export type LanguageTag = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'mr';

export type Language = {
  tag: LanguageTag;
  /** The name of the language in English. */
  name: string;
  /** The name of the language in the language itself. */
  endonym: string;
  /** True once the catalogue file for this language ships. */
  shipped: boolean;
};

/**
 * The languages Cerulea carries.
 * English ships with the build. Every other language ships as a file beside
 * it, and the switch states which ones are still awaiting one.
 */
export const LANGUAGES: Language[] = [
  { tag: 'en', name: 'English', endonym: 'English', shipped: true },
  { tag: 'hi', name: 'Hindi', endonym: 'हिन्दी', shipped: false },
  { tag: 'te', name: 'Telugu', endonym: 'తెలుగు', shipped: false },
  { tag: 'ta', name: 'Tamil', endonym: 'தமிழ்', shipped: false },
  { tag: 'bn', name: 'Bengali', endonym: 'বাংলা', shipped: false },
  { tag: 'mr', name: 'Marathi', endonym: 'मराठी', shipped: false },
];

export type MessageCatalogue = Record<string, string>;

/** The catalogue of each language that ships. */
export const CATALOGUES: Partial<Record<LanguageTag, MessageCatalogue>> = {
  en: english as MessageCatalogue,
};

/** The language a tag names, or English where the tag is unknown. */
export function languageFor(tag: string): Language {
  return LANGUAGES.find((entry) => entry.tag === tag) ?? LANGUAGES[0];
}

/** The languages that ship with this build. */
export function shippedLanguages(): Language[] {
  return LANGUAGES.filter((entry) => entry.shipped);
}

/** The catalogue one language reads, falling back to English. */
export function catalogueFor(tag: LanguageTag): MessageCatalogue {
  return CATALOGUES[tag] ?? (CATALOGUES.en as MessageCatalogue);
}

/**
 * Reads one string out of the catalogue.
 * A key the catalogue lacks answers with the fallback the caller supplied, so
 * a screen never shows a key to a person.
 */
export function read(tag: LanguageTag, key: string, fallback: string): string {
  const held = catalogueFor(tag)[key];
  if (typeof held === 'string' && held.length > 0) return held;
  const base = catalogueFor('en')[key];
  if (typeof base === 'string' && base.length > 0) return base;
  return fallback;
}

/** Fills the places a message names, written as {name}. */
export function fill(text: string, values: Record<string, string | number> = {}): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

/** The share of the English catalogue one language carries. */
export function coverageOf(tag: LanguageTag): number {
  const base = Object.keys(catalogueFor('en'));
  if (base.length === 0) return 1;
  const held = CATALOGUES[tag];
  if (held === undefined) return 0;
  const answered = base.filter((key) => typeof held[key] === 'string' && held[key].length > 0);
  return answered.length / base.length;
}

/** One sentence stating how far a language reaches. */
export function coverageStatement(tag: LanguageTag): string {
  const language = languageFor(tag);
  const share = Math.round(coverageOf(tag) * 100);
  if (share === 100) return `Every screen reads in ${language.name}.`;
  if (share === 0) {
    return `${language.name} is awaiting its file. Screens read in English until it ships.`;
  }
  return `${share} percent of the screens read in ${language.name}. The rest read in English.`;
}
