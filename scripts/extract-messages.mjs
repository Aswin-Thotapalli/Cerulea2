// studio/scripts/extract-messages.mjs
// Extracts every user-facing string in Studio into the message catalogue.
//
// A string a person reads belongs in the catalogue rather than inside a
// component, so a translator works on one file and a screen reads whichever
// language a person chose.
//
// Run it from the Studio repository root:
//   node scripts/extract-messages.mjs
//
// The script walks every component, reads the text a person sees, and writes
// apps/frontend/src/messages/en.json. A key names the file and the position of
// the string inside it, so the same source always produces the same key.
//
// The gate test reads the same sources and fails where a string is absent from
// the catalogue, so a string added later reaches the catalogue before it
// reaches a person.

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const studioRoot = resolve(here, '..');
const sourceRoot = join(studioRoot, 'apps', 'frontend', 'src');
const target = join(sourceRoot, 'messages', 'en.json');

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

/** Every component file the gate reads. */
export function componentFiles(root = sourceRoot) {
  const held = [];
  const walk = (base) => {
    for (const name of readdirSync(base)) {
      const path = join(base, name);
      if (statSync(path).isDirectory()) {
        if (name === 'node_modules' || name === 'messages') continue;
        walk(path);
        continue;
      }
      if (name.endsWith('.tsx') === false) continue;
      if (name.includes('.test.')) continue;
      held.push(path);
    }
  };
  walk(root);
  return held.sort();
}

/** Every string a person reads inside one file, in the order it appears. */
export function readableStrings(source) {
  const held = [];
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
export function keyFor(relativePath, index) {
  const base = relativePath
    .replace(/\.tsx$/, '')
    .replace(/[^A-Za-z0-9/]+/g, '_')
    .split('/')
    .join('.');
  return `${base}.${index}`;
}

/**
 * The keys authored by hand rather than read out of a component.
 * Every one of them opens with common, and the extractor keeps them.
 */
export function authoredKeys(held) {
  return Object.fromEntries(
    Object.entries(held).filter(([key]) => key.startsWith('common.')),
  );
}

function build() {
  let existing = {};
  try {
    existing = JSON.parse(readFileSync(target, 'utf8'));
  } catch {
    existing = {};
  }
  const catalogue = { ...authoredKeys(existing) };
  for (const path of componentFiles()) {
    const relativePath = relative(sourceRoot, path).split('\\').join('/');
    const strings = readableStrings(readFileSync(path, 'utf8'));
    strings.forEach((text, index) => {
      catalogue[keyFor(relativePath, index)] = text;
    });
  }
  writeFileSync(target, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
  console.info(
    `Cerulea wrote ${Object.keys(catalogue).length} English strings to ${target}.`,
  );
}

if (process.argv[1] && process.argv[1].endsWith('extract-messages.mjs')) {
  build();
}
