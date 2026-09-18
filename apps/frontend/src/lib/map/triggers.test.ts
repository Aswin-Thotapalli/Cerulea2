import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { buildRelationCatalogue } from './relations';
import { LINK_STYLE, LinkNotEditable, deleteUserLink, userMayCreate } from './links';
import { addTriggerLink, createTriggerLink, isValidTriggerPair, validTriggerPairs } from './triggers';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const templates = (templatesSeed as { templates: CatalogueTemplate[] }).templates;
const catalogue = buildRelationCatalogue(templates);
const everything = modules.map((part) => part.moduleId);
const pairs = validTriggerPairs(everything, modules, catalogue);

describe('the triggers picker offers only valid pairs', () => {
  it('lists the pairs the catalogue records', () => {
    expect(pairs.length).toBeGreaterThan(0);
    for (const pair of pairs) {
      expect(isValidTriggerPair(pair.from, pair.to, pairs)).toBe(true);
    }
  });

  it('offers no pair the catalogue never recorded', () => {
    expect(isValidTriggerPair('wallet-auth', 'rbac', pairs)).toBe(false);
  });

  it('offers no pair whose parts the project does not hold', () => {
    const small = validTriggerPairs(['proposals'], modules, catalogue);
    expect(small).toEqual([]);
  });

  it('names both parts in plain words and states the effect', () => {
    for (const pair of pairs) {
      expect(pair.fromTitle).not.toBe(pair.from);
      expect(pair.toTitle).not.toBe(pair.to);
      expect(pair.effect).toContain(pair.fromTitle);
      expect(pair.effect).toContain(pair.toTitle);
    }
  });

  it('lists the same pairs every time', () => {
    expect(validTriggerPairs(everything, modules, catalogue)).toEqual(pairs);
  });
});

describe('a triggers link is always chosen', () => {
  it('lets a user draw one', () => {
    expect(userMayCreate('triggers')).toBe(true);
  });

  it('draws as a dashed arrow', () => {
    expect(LINK_STYLE.triggers.stroke).toBe('dashed');
    expect(LINK_STYLE.triggers.arrow).toBe(true);
  });

  it('carries the reason and the effect', () => {
    const [pair] = pairs;
    const link = createTriggerLink(pair.from, pair.to, pairs);
    expect(link.type).toBe('triggers');
    expect(link.origin).toBe('chosen');
    expect(link.removable).toBe(true);
    expect(link.reason).toContain(pair.effect);
  });

  it('refuses a pair outside the list and names the list', () => {
    expect(() => createTriggerLink('wallet-auth', 'rbac', pairs)).toThrowError(LinkNotEditable);
    expect(() => createTriggerLink('wallet-auth', 'rbac', pairs)).toThrowError(
      /Pick a pair from the list the picker shows/,
    );
  });

  it('adds one pair once', () => {
    const [pair] = pairs;
    const link = createTriggerLink(pair.from, pair.to, pairs);
    const once = addTriggerLink([], link);
    expect(addTriggerLink(once, link)).toBe(once);
  });

  it('lets a user delete the link they drew', () => {
    const [pair] = pairs;
    const link = createTriggerLink(pair.from, pair.to, pairs);
    expect(deleteUserLink([link], link.linkId)).toEqual([]);
  });
});
