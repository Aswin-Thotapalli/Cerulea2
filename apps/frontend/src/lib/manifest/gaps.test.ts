import { describe, expect, it } from 'vitest';

import { gapHeadline, gapsForManifest, gapsForModules, reasonFor } from './gaps';
import { EXAMPLE_MANIFEST } from './example';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { screenReachable } from '@/lib/studio/screens';
import type { CatalogueModule } from '@/lib/catalogue/types';

/** The first part in the catalogue that recommends another part. */
const recommender = SEED_MODULES.find(
  (part) =>
    (part.recommends ?? []).some((name) =>
      SEED_MODULES.some((other) => other.moduleId === name),
    ),
) as CatalogueModule;

const recommended = SEED_MODULES.find((part) =>
  (recommender.recommends ?? []).includes(part.moduleId),
) as CatalogueModule;

describe('the recommendation gaps', () => {
  it('finds a part the catalogue recommends and the project leaves out', () => {
    const gaps = gapsForModules([recommender.moduleId], SEED_MODULES);
    const held = gaps.find((gap) => gap.moduleId === recommended.moduleId);
    expect(held).toBeDefined();
    expect(held!.title.length).toBeGreaterThan(0);
    expect(held!.reason.length).toBeGreaterThan(10);
    expect(held!.recommendedBy.map((entry) => entry.moduleId)).toContain(recommender.moduleId);
  });

  it('drops a part once the project installs it', () => {
    const gaps = gapsForModules([recommender.moduleId, recommended.moduleId], SEED_MODULES);
    expect(gaps.some((gap) => gap.moduleId === recommended.moduleId)).toBe(false);
  });

  it('drops a name the catalogue does not hold', () => {
    const invented: CatalogueModule = {
      moduleId: 'invented_part',
      title: 'Invented part',
      projectType: 'dapp',
      category: 'other',
      recommends: ['no_such_part'],
    };
    expect(gapsForModules(['invented_part'], [invented])).toEqual([]);
  });

  it('answers with nothing where the project installs no part', () => {
    expect(gapsForModules([], SEED_MODULES)).toEqual([]);
  });

  it('names the screen that installs every gap', () => {
    for (const gap of gapsForModules([recommender.moduleId], SEED_MODULES)) {
      expect(screenReachable(gap.screen)).toBe(true);
      expect(gap.screen).toBe('Compose');
    }
  });

  it('states the reason in the catalogue words where the catalogue records one', () => {
    const withReason: CatalogueModule = {
      moduleId: 'holder',
      title: 'Holder',
      projectType: 'dapp',
      category: 'other',
      recommends: ['reader'],
      reasonByDepId: { reader: 'A reader turns the records into a screen people open.' },
    };
    const reader: CatalogueModule = {
      moduleId: 'reader',
      title: 'Reader',
      projectType: 'dapp',
      category: 'other',
      blurb: 'Reads records onto a screen',
    };
    expect(reasonFor(withReason, reader)).toBe(
      'A reader turns the records into a screen people open.',
    );
    const gaps = gapsForModules(['holder'], [withReason, reader]);
    expect(gaps[0].reason).toBe('A reader turns the records into a screen people open.');
  });

  it('states what the part contributes where the catalogue records no reason', () => {
    const holder: CatalogueModule = {
      moduleId: 'holder',
      title: 'Holder',
      projectType: 'dapp',
      category: 'other',
      recommends: ['reader'],
    };
    const reader: CatalogueModule = {
      moduleId: 'reader',
      title: 'Reader',
      projectType: 'dapp',
      category: 'other',
      blurb: 'Reads records onto a screen people open, with paging and filters',
    };
    const reason = reasonFor(holder, reader);
    expect(reason).toContain('Holder works better beside it');
    expect(reason).toContain('Reads records onto a screen');
  });

  it('orders the gaps the same way every time', () => {
    const first = gapsForModules([recommender.moduleId], SEED_MODULES);
    const second = gapsForModules([recommender.moduleId], SEED_MODULES);
    expect(second).toEqual(first);
  });

  it('reads the installed parts off a manifest', () => {
    expect(gapsForManifest(EXAMPLE_MANIFEST, SEED_MODULES)).toEqual(
      gapsForModules(
        EXAMPLE_MANIFEST.modules.map((entry) => entry.module),
        SEED_MODULES,
      ),
    );
  });

  it('states what the gap list holds', () => {
    expect(gapHeadline([])).toContain('already installed');
    const one = gapsForModules([recommender.moduleId], SEED_MODULES).slice(0, 1);
    expect(gapHeadline(one)).toContain('One part');
  });
});
