import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  READABLE_PROPS,
  faultsInFile,
  gateFix,
  keyFor,
  readableStrings,
  type GateFault,
} from './gate';
import {
  CATALOGUES,
  LANGUAGES,
  catalogueFor,
  coverageOf,
  coverageStatement,
  fill,
  languageFor,
  read,
  shippedLanguages,
} from './catalogue';
import english from '@/messages/en.json';

const sourceRoot = resolve(__dirname, '..', '..');

/** Every component the gate reads, exactly as the extractor walks them. */
function componentFiles(root = sourceRoot): string[] {
  const held: string[] = [];
  const walk = (base: string) => {
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

const catalogue = english as Record<string, string>;

describe('the message catalogue', () => {
  it('ships English with every string filled', () => {
    const keys = Object.keys(catalogue);
    expect(keys.length).toBeGreaterThan(100);
    for (const key of keys) {
      expect(typeof catalogue[key], key).toBe('string');
      expect(catalogue[key].trim().length, key).toBeGreaterThan(0);
    }
  });

  it('names the languages Cerulea carries, with English shipped', () => {
    expect(LANGUAGES[0].tag).toBe('en');
    expect(shippedLanguages().map((entry) => entry.tag)).toEqual(['en']);
    for (const language of LANGUAGES) {
      expect(language.name.length, language.tag).toBeGreaterThan(0);
      expect(language.endonym.length, language.tag).toBeGreaterThan(0);
    }
    expect(Object.keys(CATALOGUES)).toEqual(['en']);
  });

  it('reads a string, and falls back where a key is absent', () => {
    const key = Object.keys(catalogue)[0];
    expect(read('en', key, 'held')).toBe(catalogue[key]);
    expect(read('en', 'no.such.key', 'The fallback')).toBe('The fallback');
    expect(read('hi', key, 'held')).toBe(catalogue[key]);
  });

  it('fills the places a message names', () => {
    expect(fill('We keep {count} records', { count: 4 })).toBe('We keep 4 records');
    expect(fill('We keep {count} records')).toBe('We keep {count} records');
  });

  it('states how far each language reaches', () => {
    expect(coverageOf('en')).toBe(1);
    expect(coverageOf('hi')).toBe(0);
    expect(coverageStatement('en')).toContain('Every screen');
    expect(coverageStatement('hi')).toContain('awaiting its file');
    expect(catalogueFor('hi')).toBe(catalogueFor('en'));
    expect(languageFor('nonsense').tag).toBe('en');
  });
});

describe('the translation gate', () => {
  it('reads the props a person sees', () => {
    expect(READABLE_PROPS).toContain('label');
    expect(READABLE_PROPS).toContain('helperText');
    expect(READABLE_PROPS).toContain('aria-label');
  });

  it('finds every string a person reads inside a component', () => {
    const source = `
      <Box>
        <Typography>Every berth this system keeps</Typography>
        <TextField label="Name of the berth" helperText="A colleague reads this." />
      </Box>
    `;
    expect(readableStrings(source)).toEqual([
      'Every berth this system keeps',
      'Name of the berth',
      'A colleague reads this.',
    ]);
  });

  it('leaves a value the component works out alone', () => {
    const source = '<Typography>{held.name}</Typography><TextField label={messages.t(key)} />';
    expect(readableStrings(source)).toEqual([]);
  });

  it('names a key after the file and the position', () => {
    expect(keyFor('components/studio/levels/LevelOneTemplate.tsx', 3)).toBe(
      'components.studio.levels.LevelOneTemplate.3',
    );
  });

  it('fails on a string the catalogue does not hold', () => {
    const faults = faultsInFile(
      'components/held/Example.tsx',
      '<Typography>A sentence nothing in the catalogue holds</Typography>',
      catalogue,
    );
    expect(faults).toHaveLength(1);
    expect(faults[0].text).toBe('A sentence nothing in the catalogue holds');
    expect(gateFix(faults)).toContain('scripts/extract-messages.mjs');
  });

  it('passes a string the catalogue holds', () => {
    const held = Object.values(catalogue)[0];
    expect(
      faultsInFile('components/held/Example.tsx', `<Typography>${held}</Typography>`, catalogue),
    ).toEqual([]);
    expect(gateFix([])).toContain('sits in the message catalogue');
  });
});

describe('every string in every component sits in the catalogue', () => {
  it('holds no string outside the catalogue', () => {
    const faults: GateFault[] = [];
    for (const path of componentFiles()) {
      const relativePath = relative(sourceRoot, path).split('\\').join('/');
      faults.push(...faultsInFile(relativePath, readFileSync(path, 'utf8'), catalogue));
    }
    const named = faults
      .slice(0, 10)
      .map((fault) => `${fault.file}: ${fault.text}`)
      .join('\n');
    expect(faults.length, `${gateFix(faults)}\n${named}`).toBe(0);
  });

  it('reads at least one string from every screen a person opens', () => {
    const screens = componentFiles().filter((path) => path.includes('studio'));
    expect(screens.length).toBeGreaterThan(10);
    const withStrings = screens.filter(
      (path) => readableStrings(readFileSync(path, 'utf8')).length > 0,
    );
    expect(withStrings.length).toBeGreaterThan(screens.length / 2);
  });
});
