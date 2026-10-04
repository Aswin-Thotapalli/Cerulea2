import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import { indexModules } from '@/lib/modules/resolve';
import { deriveOutcomes, firstClause, groupLabel, groupOutcomes } from './catalogue';
import { describeOutcomes, filterOutcomes, groupOutcomeCards, outcomeBundle } from './browse';

const modules = SEED_MODULES;
const index = indexModules(modules);
const cards = describeOutcomes(modules);
// The catalogue carries one statement per module and one per bridge target network.
const BRIDGE_STATEMENTS = 7;
const ALL = modules.length + BRIDGE_STATEMENTS;
const PRIVATE = modules.filter((part) => part.projectType === 'blockchain').length + BRIDGE_STATEMENTS;

describe('firstClause', () => {
  it('cuts at the first stop that follows at least four words', () => {
    expect(firstClause('Sign in with a crypto wallet; optional server session.')).toBe(
      'Sign in with a crypto wallet',
    );
  });

  it('keeps a short lead-in whole', () => {
    expect(firstClause('Track, verify and settle every shipment on arrival.')).toBe(
      'Track, verify and settle every shipment on arrival',
    );
  });

  it('answers an empty blurb with an empty clause', () => {
    expect(firstClause('   ')).toBe('');
  });
});

describe('groupLabel', () => {
  it('writes a category identifier in plain words', () => {
    expect(groupLabel('identity-access')).toBe('Identity Access');
    expect(groupLabel('Rollups & Interop')).toBe('Rollups & Interop');
  });
});

describe('the outcome catalogue', () => {
  it('carries one statement per module and one per bridge target network', () => {
    expect(cards).toHaveLength(ALL);
  });

  it('never shows an internal identifier inside a statement', () => {
    for (const card of cards) {
      expect(card.outcome.statement).not.toContain('outcome:');
      if (card.outcome.anchorModuleId.includes('-')) {
        expect(card.outcome.statement).not.toContain(card.outcome.anchorModuleId);
      }
    }
  });

  it('groups every statement under an area', () => {
    const groups = groupOutcomeCards(cards);
    expect(groups.length).toBeGreaterThan(1);
    expect(groups.reduce((total, entry) => total + entry.cards.length, 0)).toBe(ALL);
    const sizes = groups.map((entry) => entry.cards.length);
    expect([...sizes].sort((left, right) => right - left)).toEqual(sizes);
  });

  it('orders the plain grouping by name', () => {
    const grouped = groupOutcomes(deriveOutcomes(modules));
    const names = grouped.map((entry) => entry.group);
    expect([...names].sort((left, right) => left.localeCompare(right))).toEqual(names);
  });
});

describe('the module bundle behind a statement', () => {
  it('always installs the module the statement came from', () => {
    for (const card of cards) {
      const anchors = card.bundle.filter((part) => part.anchor);
      expect(anchors).toHaveLength(1);
      expect(anchors[0].moduleId).toBe(card.outcome.anchorModuleId);
    }
  });

  it('installs every module the anchor needs', () => {
    const rbac = cards.find((card) => card.outcome.anchorModuleId === 'rbac');
    const ids = rbac?.bundle.map((part) => part.moduleId) ?? [];
    expect(ids).toContain('wallet-auth');
    expect(ids.indexOf('wallet-auth')).toBeLessThan(ids.indexOf('rbac'));
  });

  it('states the reason a module joined the bundle', () => {
    const rbac = cards.find((card) => card.outcome.anchorModuleId === 'rbac');
    const pulled = rbac?.bundle.find((part) => part.moduleId === 'wallet-auth');
    expect(pulled?.reason).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('gives every part a plain sentence on what it contributes', () => {
    for (const card of cards) {
      for (const part of card.bundle) {
        expect(part.contribution.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('produces the same bundle every time', () => {
    const outcome = deriveOutcomes(modules)[0];
    expect(outcomeBundle(outcome, index)).toEqual(outcomeBundle(outcome, index));
  });
});

describe('filterOutcomes', () => {
  it('finds a statement by a word in the statement itself', () => {
    const found = filterOutcomes(cards, { query: 'wallet' });
    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThan(cards.length);
  });

  it('narrows by area', () => {
    const [top] = groupOutcomeCards(cards);
    const inGroup = filterOutcomes(cards, { group: top.group });
    expect(inGroup).toHaveLength(top.cards.length);
  });

  it('narrows by network', () => {
    const onPrivate = filterOutcomes(cards, { track: 'blockchain' });
    expect(onPrivate.length).toBe(PRIVATE);
    expect(onPrivate.every((card) => card.outcome.projectType === 'blockchain')).toBe(true);
  });

  it('returns the whole catalogue when nothing is set', () => {
    expect(filterOutcomes(cards, {})).toHaveLength(ALL);
  });
});
