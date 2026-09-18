import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import templatesSeed from '@/data/templates.seed.json';
import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { stem, tokenise, tokeniseWithSource } from './tokenise';
import { reasonFromTerms, scoreDocuments } from './match';
import { proposeFromDescription, proposeTrack } from './propose';

const catalogue = {
  modules: (modulesSeed as { modules: CatalogueModule[] }).modules,
  templates: (templatesSeed as { templates: CatalogueTemplate[] }).templates,
};

describe('the catalogue behind the matcher', () => {
  it('carries the whole module and template set', () => {
    expect(catalogue.modules).toHaveLength(225);
    expect(catalogue.templates).toHaveLength(100);
  });
});

describe('tokenise', () => {
  it('drops words that name no subject', () => {
    expect(tokenise('We want the system to be very good')).toEqual(['system', 'good']);
  });

  it('brings plural and past forms to one root', () => {
    expect(stem('shipments')).toBe('shipment');
    expect(stem('inspections')).toBe('inspection');
    expect(stem('issued')).toBe('issu');
    expect(stem('tracking')).toBe('track');
  });

  it('keeps each term once and holds the order', () => {
    expect(tokenise('invoice invoices billing')).toEqual(['invoice', 'bill']);
  });

  it('reports the word we wrote beside the term it matches on', () => {
    expect(tokeniseWithSource('tracking shipments')).toEqual([
      { term: 'track', word: 'tracking' },
      { term: 'shipment', word: 'shipments' },
    ]);
  });
});

describe('scoreDocuments', () => {
  const documents = [
    { id: 'a', fields: { name: ['Shipment tracking'], description: ['Records each handling step'] } },
    { id: 'b', fields: { description: ['A shipment moves between warehouses'] } },
    { id: 'c', fields: { name: ['Payroll'] } },
  ];

  it('weighs a name above a summary', () => {
    const scored = scoreDocuments('shipment', documents);
    expect(scored.map((item) => item.id)).toEqual(['a', 'b']);
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
  });

  it('leaves out entries that share no term', () => {
    expect(scoreDocuments('shipment', documents).map((item) => item.id)).not.toContain('c');
  });

  it('reports the share of our words an entry answers', () => {
    const [top] = scoreDocuments('shipment handling', documents);
    expect(top.coverage).toBe(1);
    expect(top.matchedTerms).toEqual(['shipment', 'handling']);
  });

  it('returns nothing for an empty description', () => {
    expect(scoreDocuments('   ', documents)).toEqual([]);
  });

  it('produces the same list every time', () => {
    const first = scoreDocuments('shipment handling step', documents);
    const second = scoreDocuments('shipment handling step', documents);
    expect(first).toEqual(second);
  });
});

describe('reasonFromTerms', () => {
  it('names the words that matched', () => {
    expect(reasonFromTerms(['shipment'])).toBe('Our description mentions shipment.');
    expect(reasonFromTerms(['shipment', 'buyer'])).toBe('Our description mentions shipment and buyer.');
    expect(reasonFromTerms(['a', 'b', 'c'])).toBe('Our description mentions a, b and c.');
  });
});

describe('proposeFromDescription over the real catalogue', () => {
  const supplyChain = proposeFromDescription(
    'We track every handling step of a shipment and let a buyer verify the goods on arrival.',
    catalogue,
  );

  it('proposes templates and states the reason for each', () => {
    expect(supplyChain.templates.length).toBeGreaterThan(0);
    for (const candidate of supplyChain.templates) {
      expect(candidate.matchedTerms.length).toBeGreaterThan(0);
      expect(candidate.reason).toContain('Our description mentions');
      for (const term of candidate.matchedTerms) {
        expect(supplyChain.terms).toContain(term);
      }
    }
  });

  it('proposes outcomes drawn from the module catalogue', () => {
    expect(supplyChain.outcomes.length).toBeGreaterThan(0);
    const anchors = new Set(catalogue.modules.map((module) => module.moduleId));
    for (const candidate of supplyChain.outcomes) {
      expect(anchors.has(candidate.outcome.anchorModuleId)).toBe(true);
      expect(candidate.outcome.statement.length).toBeGreaterThan(0);
      expect(candidate.reason).toContain('Our description mentions');
    }
  });

  it('reaches a supply chain template for a supply chain description', () => {
    const titles = supplyChain.templates.map((candidate) => candidate.template.title.toLowerCase());
    expect(titles.some((title) => title.includes('supply') || title.includes('trace') || title.includes('provenance')))
      .toBe(true);
  });

  it('proposes a track and states the reason', () => {
    expect(['dapp', 'blockchain']).toContain(supplyChain.track.track);
    expect(supplyChain.track.reason.length).toBeGreaterThan(0);
  });

  it('reports an empty proposal when nothing matches', () => {
    const nothing = proposeFromDescription('zzzq wwwv', catalogue);
    expect(nothing.empty).toBe(true);
    expect(nothing.templates).toEqual([]);
    expect(nothing.outcomes).toEqual([]);
  });

  it('produces the same proposal on a second run', () => {
    const again = proposeFromDescription(
      'We track every handling step of a shipment and let a buyer verify the goods on arrival.',
      catalogue,
    );
    expect(again.templates.map((item) => item.template.id)).toEqual(
      supplyChain.templates.map((item) => item.template.id),
    );
    expect(again.outcomes.map((item) => item.outcome.outcomeId)).toEqual(
      supplyChain.outcomes.map((item) => item.outcome.outcomeId),
    );
  });

  it('honours the limits it is given', () => {
    const small = proposeFromDescription('shipment inspector certificate', catalogue, {
      templateLimit: 2,
      outcomeLimit: 3,
    });
    expect(small.templates.length).toBeLessThanOrEqual(2);
    expect(small.outcomes.length).toBeLessThanOrEqual(3);
  });
});

describe('proposeTrack', () => {
  it('starts on the public-access chain when nothing matched', () => {
    expect(proposeTrack([]).track).toBe('dapp');
  });

  it('proposes a private network when the closest templates run on one', () => {
    const proposal = proposeTrack([
      {
        template: { id: 't1', projectType: 'blockchain', title: 'Land registry' },
        score: 10,
        coverage: 1,
        matchedTerms: ['land'],
        reason: '',
      },
      {
        template: { id: 't2', projectType: 'dapp', title: 'Wallet' },
        score: 2,
        coverage: 0.5,
        matchedTerms: ['wallet'],
        reason: '',
      },
    ]);
    expect(proposal.track).toBe('blockchain');
    expect(proposal.reason).toContain('Land registry');
  });
});

describe('the derived outcome catalogue', () => {
  const outcomes = deriveOutcomes(catalogue.modules);

  it('derives one outcome for every module', () => {
    expect(outcomes).toHaveLength(225);
  });

  it('gives every outcome a plain statement and a group', () => {
    for (const outcome of outcomes) {
      expect(outcome.statement.trim().length).toBeGreaterThan(0);
      expect(outcome.statement.endsWith('.')).toBe(false);
      expect(outcome.group.trim().length).toBeGreaterThan(0);
      expect(outcome.removalConsequence.trim().length).toBeGreaterThan(0);
    }
  });

  it('states what stops working from the reason a dependant already records', () => {
    const rbac = outcomes.find((outcome) => outcome.anchorModuleId === 'wallet-auth');
    expect(rbac?.removalConsequence).toContain('stops working');
  });
});
