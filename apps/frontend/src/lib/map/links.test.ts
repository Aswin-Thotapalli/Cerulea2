import { describe, expect, it } from 'vitest';
import { SEED_MODULES } from '@/lib/catalogue/seed';

import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { resolveOutcomeSelection } from '@/lib/outcomes/resolve';
import {
  LINK_STYLE,
  LinkNotEditable,
  createUserLink,
  deleteUserLink,
  deriveRequiresLinks,
  userMayCreate,
  userMayDelete,
} from './links';

const modules = SEED_MODULES;
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;
const resolution = resolveOutcomeSelection([outcomeFor('rbac'), outcomeFor('kyc')], outcomes, modules);
const requires = deriveRequiresLinks(resolution.installOrder, modules);

describe('the four link shapes read differently', () => {
  it('draws requires as a solid line with no arrow', () => {
    expect(LINK_STYLE.requires.stroke).toBe('solid');
    expect(LINK_STYLE.requires.arrow).toBe(false);
  });

  it('draws feeds as an arrow', () => {
    expect(LINK_STYLE.feeds.arrow).toBe(true);
  });

  it('draws triggers as a dashed arrow', () => {
    expect(LINK_STYLE.triggers.stroke).toBe('dashed');
    expect(LINK_STYLE.triggers.arrow).toBe(true);
  });

  it('draws governs as a dotted line', () => {
    expect(LINK_STYLE.governs.stroke).toBe('dotted');
    expect(LINK_STYLE.governs.arrow).toBe(false);
  });

  it('states what each link means and what breaks without it', () => {
    for (const style of Object.values(LINK_STYLE)) {
      expect(style.meaning).toMatch(/Remove/);
      expect(style.meaning.length).toBeGreaterThan(40);
    }
  });
});

describe('requires links are derived from the dependency lists', () => {
  it('draws one link per dependency that the project holds', () => {
    const index = new Map(modules.map((part) => [part.moduleId, part]));
    const held = new Set(resolution.installOrder);
    let expected = 0;
    for (const moduleId of resolution.installOrder) {
      for (const dependency of index.get(moduleId)?.dependsOn ?? []) {
        if (held.has(dependency)) expected += 1;
      }
    }
    expect(requires).toHaveLength(expected);
  });

  it('points from the part that needs to the part it needs', () => {
    const link = requires.find((candidate) => candidate.from === 'rbac');
    expect(link?.to).toBe('wallet-auth');
    expect(link?.type).toBe('requires');
  });

  it('carries the reason the seed records', () => {
    const link = requires.find((candidate) => candidate.linkId === 'requires:rbac->wallet-auth');
    expect(link?.reason).toBe(
      'RBAC needs a verified identity to attach roles and evaluate permissions.',
    );
  });

  it('marks every requires link as derived and fixed', () => {
    for (const link of requires) {
      expect(link.origin).toBe('derived');
      expect(link.removable).toBe(false);
      expect(userMayDelete(link)).toBe(false);
    }
  });

  it('draws the same links every time', () => {
    expect(deriveRequiresLinks(resolution.installOrder, modules)).toEqual(requires);
  });

  it('draws no link to a part the project does not hold', () => {
    const held = new Set(resolution.installOrder);
    for (const link of requires) {
      expect(held.has(link.from)).toBe(true);
      expect(held.has(link.to)).toBe(true);
    }
  });
});

describe('a user neither creates nor deletes a requires link', () => {
  it('refuses to create one and names the action that works', () => {
    expect(userMayCreate('requires')).toBe(false);
    expect(() => createUserLink('requires', 'rbac', 'wallet-auth', 'because')).toThrowError(
      LinkNotEditable,
    );
    expect(() => createUserLink('requires', 'rbac', 'wallet-auth', 'because')).toThrowError(
      /Add or remove an outcome/,
    );
  });

  it('refuses to delete one and names the action that works', () => {
    expect(() => deleteUserLink(requires, requires[0].linkId)).toThrowError(
      /Remove the outcome that installed these parts/,
    );
  });

  it('leaves the list alone when the link is absent', () => {
    expect(deleteUserLink(requires, 'requires:nothing->nothing')).toBe(requires);
  });
});
