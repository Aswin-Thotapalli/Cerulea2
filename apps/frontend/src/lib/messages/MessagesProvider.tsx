'use client';

// apps/frontend/src/lib/messages/MessagesProvider.tsx
// The language every Studio screen reads in.
// A screen asks for a key and the provider answers with the text of the
// language a person chose. The choice stays on the machine that made it, so a
// colleague opening the same project reads their own language.
// Without the provider each screen would hold its own words.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  coverageStatement,
  fill,
  languageFor,
  read,
  LANGUAGES,
  type Language,
  type LanguageTag,
} from './catalogue';

/** Where the browser keeps the language a person chose. */
export const LANGUAGE_KEY = 'cerulea.language';

export type MessagesHandle = {
  language: Language;
  languages: Language[];
  /** Reads one string, filling any place it names. */
  t: (key: string, fallback: string, values?: Record<string, string | number>) => string;
  setLanguage: (tag: LanguageTag) => void;
  /** One sentence stating how far the chosen language reaches. */
  coverage: string;
};

const MessagesContext = createContext<MessagesHandle | null>(null);

/** Reads the language the browser kept, falling back to English. */
export function heldLanguage(): LanguageTag {
  try {
    const kept = window.localStorage.getItem(LANGUAGE_KEY);
    if (kept) return languageFor(kept).tag;
  } catch {
    return 'en';
  }
  return 'en';
}

export function MessagesProvider({
  children,
  language: supplied,
}: {
  children: ReactNode;
  /** The language to open in. Tests supply one. */
  language?: LanguageTag;
}) {
  const [tag, setTag] = useState<LanguageTag>(supplied ?? 'en');

  useEffect(() => {
    if (supplied !== undefined) return;
    setTag(heldLanguage());
  }, [supplied]);

  const setLanguage = useCallback((next: LanguageTag) => {
    setTag(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // A browser holding no storage still reads the language for this visit.
    }
  }, []);

  const value = useMemo<MessagesHandle>(
    () => ({
      language: languageFor(tag),
      languages: LANGUAGES,
      t: (key, fallback, values) => fill(read(tag, key, fallback), values),
      setLanguage,
      coverage: coverageStatement(tag),
    }),
    [setLanguage, tag],
  );

  return <MessagesContext.Provider value={value}>{children}</MessagesContext.Provider>;
}

/**
 * The messages handle for one screen.
 * A screen rendered outside the provider still reads English, so a test
 * rendering one component on its own needs no wrapper.
 */
export function useMessages(): MessagesHandle {
  const held = useContext(MessagesContext);
  if (held !== null) return held;
  return {
    language: LANGUAGES[0],
    languages: LANGUAGES,
    t: (key, fallback, values) => fill(read('en', key, fallback), values),
    setLanguage: () => undefined,
    coverage: coverageStatement('en'),
  };
}
