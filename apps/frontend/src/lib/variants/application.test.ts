import { describe, expect, it } from 'vitest';

import {
  APPLICATION_VARIANTS,
  GOVERNMENT_WITHHELD,
  airGapGate,
  organisationGate,
  partOffered,
  partWords,
  partsFor,
  projectGate,
  tierFor,
  trackGate,
  variantFor,
  withheldReason,
} from './application';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { deriveTrack, type Application } from '@/lib/track/derive';
import { GOVERNMENT_TEMPLATES } from './government';
import type { CatalogueModule } from '@/lib/catalogue/types';

const EVERY: Application[] = ['dapps', 'enterprise', 'government'];

describe('the three applications of section 2.4', () => {
  it('names the audience and the default network of each one', () => {
    expect(APPLICATION_VARIANTS.dapps.audience).toBe('Independent builders and small teams');
    expect(APPLICATION_VARIANTS.dapps.defaultTrack).toBe('dapp');
    expect(APPLICATION_VARIANTS.enterprise.audience).toBe('Companies with compliance duties');
    expect(APPLICATION_VARIANTS.enterprise.defaultTrack).toBe('blockchain');
    expect(APPLICATION_VARIANTS.government.audience).toBe('Public bodies and agencies');
    expect(APPLICATION_VARIANTS.government.defaultTrack).toBe('blockchain');
  });

  it('carries the tier count section 2.4 states', () => {
    expect(APPLICATION_VARIANTS.dapps.tiers.map((tier) => tier.label)).toEqual([
      'Public',
      'Private',
      'Private Pro',
    ]);
    expect(APPLICATION_VARIANTS.enterprise.tiers).toHaveLength(3);
    expect(APPLICATION_VARIANTS.government.tiers).toHaveLength(1);
  });

  it('runs Government on a private Blockchain network alone', () => {
    expect(APPLICATION_VARIANTS.government.bothTracks).toBe(false);
    for (const tier of APPLICATION_VARIANTS.government.tiers) {
      expect(tier.tracks).toEqual(['blockchain']);
    }
    expect(deriveTrack('government').questionShown).toBe(false);
  });

  it('agrees with the network derivation on every application', () => {
    for (const application of EVERY) {
      expect(deriveTrack(application).track, application).toBe(
        variantFor(application).defaultTrack,
      );
    }
  });

  it('states what every application serves and the words it uses', () => {
    for (const application of EVERY) {
      const variant = variantFor(application);
      expect(variant.serves.endsWith('.'), application).toBe(true);
      expect(variant.words.project.length, application).toBeGreaterThan(0);
      expect(variant.words.organisation.length, application).toBeGreaterThan(0);
    }
  });

  it('answers with Dapps for a name it does not hold', () => {
    expect(variantFor('nonsense' as Application).application).toBe('dapps');
  });
});

describe('the part subset of each application', () => {
  it('offers the whole catalogue to Dapps and Enterprise', () => {
    expect(partsFor('dapps', SEED_MODULES)).toHaveLength(SEED_MODULES.length);
    expect(partsFor('enterprise', SEED_MODULES)).toHaveLength(SEED_MODULES.length);
  });

  it('offers a narrower set to Government', () => {
    const held = partsFor('government', SEED_MODULES);
    expect(held.length).toBeGreaterThan(0);
    expect(held.length).toBeLessThan(SEED_MODULES.length);
  });

  it('withholds the parts Government holds no remit for', () => {
    for (const part of SEED_MODULES) {
      const words = partWords(part.moduleId);
      if (GOVERNMENT_WITHHELD.some((word) => words.includes(word))) {
        expect(partOffered('government', part), part.moduleId).toBe(false);
      }
    }
  });

  it('states why a part is withheld', () => {
    const withheld = SEED_MODULES.find((part) => partOffered('government', part) === false)!;
    const reason = withheldReason('government', withheld);
    expect(reason).toContain('Cerulea for Government');
    expect(withheldReason('dapps', withheld)).toBeNull();
  });

  it('offers a part of an area Government works in', () => {
    const identity: CatalogueModule = {
      moduleId: 'officer_identity',
      title: 'Officer identity',
      projectType: 'blockchain',
      category: 'identity',
    };
    expect(partOffered('government', identity)).toBe(true);
  });


  it('reads a part name as whole words', () => {
    expect(partWords('indexer-sink')).toEqual(['indexer', 'sink']);
    expect(GOVERNMENT_WITHHELD).toContain('dex');
    expect(
      partOffered('government', {
        moduleId: 'indexer-sink',
        title: 'Indexer sink',
        projectType: 'blockchain',
        category: 'Data & Logic',
      }),
    ).toBe(true);
    expect(
      partOffered('government', {
        moduleId: 'dex-core',
        title: 'Exchange core',
        projectType: 'dapp',
        category: 'Finance & Settlement',
      }),
    ).toBe(false);
  });

  it('offers every part a Government template names', () => {
    const offered = new Set(partsFor('government', SEED_MODULES).map((part) => part.moduleId));
    for (const template of GOVERNMENT_TEMPLATES) {
      for (const name of template.modules ?? []) {
        expect(offered.has(name), `${template.id} ${name}`).toBe(true);
      }
    }
  });
});

describe('the commercial gates', () => {
  it('admits one more project below the limit and refuses at it', () => {
    const tier = tierFor('dapps', 'public')!;
    expect(projectGate(tier, 0).admitted).toBe(true);
    const refused = projectGate(tier, 1);
    expect(refused.admitted).toBe(false);
    expect(refused.fix).toContain('next tier');
  });

  it('admits a network the tier deploys to and refuses the other', () => {
    const tier = tierFor('dapps', 'public')!;
    expect(trackGate(tier, 'dapp').admitted).toBe(true);
    const refused = trackGate(tier, 'blockchain');
    expect(refused.admitted).toBe(false);
    expect(refused.fix).toContain('foundation screen');
  });

  it('admits the organisations the tier holds and refuses more', () => {
    const tier = tierFor('enterprise', 'enterprise_one')!;
    expect(organisationGate(tier, 3).admitted).toBe(true);
    const refused = organisationGate(tier, 4);
    expect(refused.admitted).toBe(false);
    expect(refused.fix).toContain('policies screen');
  });

  it('admits an air-gapped installation on the tiers that carry it', () => {
    expect(airGapGate(tierFor('government', 'government')!).admitted).toBe(true);
    expect(airGapGate(tierFor('enterprise', 'enterprise_three')!).admitted).toBe(true);
    const refused = airGapGate(tierFor('dapps', 'public')!);
    expect(refused.admitted).toBe(false);
    expect(refused.fix).toContain('air-gapped');
  });

  it('locks residency on every Enterprise and Government tier', () => {
    for (const tier of APPLICATION_VARIANTS.enterprise.tiers) {
      expect(tier.residencyLock, tier.id).toBe(true);
    }
    for (const tier of APPLICATION_VARIANTS.government.tiers) {
      expect(tier.residencyLock, tier.id).toBe(true);
    }
    for (const tier of APPLICATION_VARIANTS.dapps.tiers) {
      expect(tier.residencyLock, tier.id).toBe(false);
    }
  });

  it('answers with nothing for a tier an application does not sell', () => {
    expect(tierFor('government', 'private_pro')).toBeUndefined();
  });

  it('states every gate answer in a sentence', () => {
    const tier = tierFor('dapps', 'private')!;
    for (const answer of [
      projectGate(tier, 0),
      trackGate(tier, 'dapp'),
      organisationGate(tier, 1),
      airGapGate(tier),
    ]) {
      expect(answer.because.endsWith('.')).toBe(true);
      if (answer.fix) expect(answer.fix.endsWith('.')).toBe(true);
    }
  });
});
