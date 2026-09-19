// apps/frontend/src/lib/messages/gate.ts
// The translation gate.
//
// Every string a person reads belongs in the message catalogue. This module
// reads the component sources, finds every string a person reads and reports
// each one the catalogue does not hold.
//
// The rules match scripts/extract-messages.mjs exactly, so a string the
// extractor writes is a string the gate admits, and a string added to a
// component after the last extraction fails the gate until it is extracted.
//
// Without the gate a string added later would reach a person in English alone.

/** The props whose value a person reads on the screen. */
export const READABLE_PROPS = [
  'label',
  'title',
  'helperText',
  'placeholder',
  'primary',
  'secondary',
  'aria-label',
  'alt',
  'subject',
  'heading',
  'note',
];

const PROP_PATTERN = new RegExp(
  `\\b(${READABLE_PROPS.join('|')})=\\{?["'\`]([^"'\`{}]{2,})["'\`]\\}?`,
  'g',
);

const TEXT_PATTERN = />\s*([A-Z][^<>{}\n]{6,}?)\s*</g;

/** Every string a person reads inside one component source, in order. */
export function readableStrings(source: string): string[] {
  const held: { at: number; text: string }[] = [];
  for (const match of source.matchAll(PROP_PATTERN)) {
    held.push({ at: match.index ?? 0, text: match[2].trim() });
  }
  for (const match of source.matchAll(TEXT_PATTERN)) {
    const text = match[1].replace(/\s+/g, ' ').trim();
    if (text.length === 0) continue;
    held.push({ at: match.index ?? 0, text });
  }
  return held
    .sort((left, right) => left.at - right.at)
    .map((entry) => entry.text)
    .filter((text, index, list) => list.indexOf(text) === index);
}

/** The key one string carries inside the catalogue. */
export function keyFor(relativePath: string, index: number): string {
  const base = relativePath
    .replace(/\.tsx$/, '')
    .replace(/[^A-Za-z0-9/]+/g, '_')
    .split('/')
    .join('.');
  return `${base}.${index}`;
}

export type GateFault = {
  /** The file the string sits in. */
  file: string;
  /** The key the string would carry. */
  key: string;
  /** The string a person reads. */
  text: string;
};

/**
 * Every string one file holds that the catalogue does not.
 * A fault names the file, the key and the words, so the fix is to run the
 * extractor and commit the catalogue.
 */
export function faultsInFile(
  relativePath: string,
  source: string,
  catalogue: Record<string, string>,
): GateFault[] {
  const held = new Set(Object.values(catalogue));
  return readableStrings(source)
    .map((text, index) => ({ file: relativePath, key: keyFor(relativePath, index), text }))
    .filter((fault) => held.has(fault.text) === false);
}

/** One sentence naming what to do about a set of faults. */
export function gateFix(faults: GateFault[]): string {
  if (faults.length === 0) {
    return 'Every string a person reads sits in the message catalogue.';
  }
  return (
    `${faults.length} strings sit inside a component and not in the catalogue. ` +
    'Run node scripts/extract-messages.mjs from the Studio root, then commit the catalogue.'
  );
}
