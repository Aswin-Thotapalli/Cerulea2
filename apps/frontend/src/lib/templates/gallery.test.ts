import { describe, expect, it } from 'vitest';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import type { CatalogueTemplate } from '@/lib/catalogue/types';
import { indexModules, resolveDependencyClosure } from '@/lib/modules/resolve';
import {
  STANDARD_LIMIT,
  STARTER_LIMIT,
  describeTemplate,
  describeTemplates,
  difficultyFor,
  filterTemplates,
  galleryAreas,
} from './gallery';

const modules = SEED_MODULES;
const templates = SEED_TEMPLATES;
const index = indexModules(modules);
const cards = describeTemplates(templates, modules);

describe('difficultyFor', () => {
  it('reads the band from the decision count', () => {
    expect(difficultyFor(STARTER_LIMIT)).toBe('Starter');
    expect(difficultyFor(STARTER_LIMIT + 1)).toBe('Standard');
    expect(difficultyFor(STANDARD_LIMIT)).toBe('Standard');
    expect(difficultyFor(STANDARD_LIMIT + 1)).toBe('Advanced');
  });
});

describe('describeTemplate', () => {
  it('describes every template in the catalogue', () => {
    expect(cards).toHaveLength(100);
  });

  it('counts every part the template installs, dependencies included', () => {
    const wallet = templates.find((template) => template.id === 'dapp-crypto-wallet') as CatalogueTemplate;
    const card = describeTemplate(wallet, index);
    const closure = resolveDependencyClosure(wallet.modules ?? [], index);
    expect(card.partCount).toBe(closure.installed.length);
    expect(card.partCount).toBeGreaterThanOrEqual((wallet.modules ?? []).length - closure.missing.length);
  });

  it('gives every card an area list and a badge that states its reason', () => {
    for (const card of cards) {
      expect(card.areas.length).toBeGreaterThan(0);
      expect(['Starter', 'Standard', 'Advanced']).toContain(card.difficulty);
      expect(card.difficultyReason).toMatch(/Cerulea installs \d+ parts across \d+ areas/);
    }
  });

  it('uses all three difficulty bands across the catalogue', () => {
    const bands = new Set(cards.map((card) => card.difficulty));
    expect(bands).toEqual(new Set(['Starter', 'Standard', 'Advanced']));
  });

  it('reports the parts a template names that the catalogue does not hold', () => {
    const withGaps = cards.filter((card) => card.missingParts.length > 0);
    expect(withGaps.length).toBeGreaterThan(0);
    for (const card of withGaps) {
      for (const missing of card.missingParts) {
        expect(index.has(missing)).toBe(false);
      }
    }
  });
});

describe('filterTemplates', () => {
  it('finds a template by a word in its summary', () => {
    const found = filterTemplates(cards, { query: 'wallet' });
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThan(cards.length);
  });

  it('answers a search only when the card answers every word', () => {
    const both = filterTemplates(cards, { query: 'wallet payroll' });
    const one = filterTemplates(cards, { query: 'wallet' });
    expect(both.length).toBeLessThanOrEqual(one.length);
  });

  it('narrows by network', () => {
    const privateOnly = filterTemplates(cards, { track: 'blockchain' });
    expect(privateOnly.length).toBeGreaterThan(0);
    expect(privateOnly.every((card) => card.template.projectType === 'blockchain')).toBe(true);
  });

  it('narrows by difficulty', () => {
    const starters = filterTemplates(cards, { difficulty: 'Starter' });
    expect(starters.length).toBeGreaterThan(0);
    expect(starters.every((card) => card.difficulty === 'Starter')).toBe(true);
  });

  it('narrows by area', () => {
    const [top] = galleryAreas(cards);
    const inArea = filterTemplates(cards, { areas: [top.area] });
    expect(inArea).toHaveLength(top.count);
    expect(inArea.every((card) => card.areas.includes(top.area))).toBe(true);
  });

  it('returns the whole gallery when nothing is set', () => {
    expect(filterTemplates(cards, {})).toHaveLength(100);
  });
});

describe('galleryAreas', () => {
  it('lists the areas with the count of templates that touch each', () => {
    const areas = galleryAreas(cards);
    expect(areas.length).toBeGreaterThan(1);
    for (const entry of areas) {
      expect(entry.count).toBeGreaterThan(0);
    }
    const counts = areas.map((entry) => entry.count);
    expect([...counts].sort((left, right) => right - left)).toEqual(counts);
  });
});

describe('resolveDependencyClosure', () => {
  it('places a dependency before the module that needs it', () => {
    const closure = resolveDependencyClosure(['rbac'], index);
    expect(closure.installed).toContain('wallet-auth');
    expect(closure.installed.indexOf('wallet-auth')).toBeLessThan(closure.installed.indexOf('rbac'));
  });

  it('records which module asked for a dependency and why', () => {
    const closure = resolveDependencyClosure(['rbac'], index);
    expect(closure.requiredBy['wallet-auth']).toEqual(['rbac']);
    expect(closure.reasonById['wallet-auth']).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('reports a name the catalogue does not hold instead of stopping', () => {
    const closure = resolveDependencyClosure(['rbac', 'no-such-part'], index);
    expect(closure.missing).toEqual(['no-such-part']);
    expect(closure.installed).toContain('rbac');
  });

  it('produces the same list every time', () => {
    const first = resolveDependencyClosure(['rbac', 'kyc'], index);
    const second = resolveDependencyClosure(['rbac', 'kyc'], index);
    expect(first.installed).toEqual(second.installed);
  });
});
