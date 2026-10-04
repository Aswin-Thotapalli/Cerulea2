import { describe, expect, it } from 'vitest';

import type { CatalogueModule, CatalogueTemplate } from '@/lib/catalogue/types';
import { describeQuestion, matchModule, matchTemplate, readIntelligenceReply, readNamedLines } from './intelligence';

const modules: CatalogueModule[] = [
  { moduleId: 'intake', title: 'Shipment Intake', projectType: 'blockchain', category: 'records', blurb: 'Records each arriving shipment.', dependsOn: [] },
  { moduleId: 'inspection', title: 'Inspection Sign Off', projectType: 'blockchain', category: 'quality', blurb: 'Lets an inspector sign before release.', dependsOn: [] },
  { moduleId: 'listing', title: 'Listing', projectType: 'dapp', category: 'market', blurb: 'Lists an item for sale.', dependsOn: [] },
];

const templates: CatalogueTemplate[] = [
  { id: 'chain-supply', projectType: 'blockchain', title: 'Supply Chain', description: 'Track shipments.', modules: ['intake', 'inspection'] },
  { id: 'dapp-market', projectType: 'dapp', title: 'Marketplace', description: 'Sell items.', modules: ['listing'] },
];

describe('describeQuestion', () => {
  it('carries the sentence and asks for the line form', () => {
    const question = describeQuestion('  We track   every shipment. ');
    expect(question).toContain('"We track every shipment."');
    expect(question).toContain('template: <template identifier>');
    expect(question).toContain('module: <module identifier>');
    expect(question).toContain('application:');
  });
});

describe('readNamedLines', () => {
  it('reads plain lines, bullets and quoted identifiers with their reasons', () => {
    const lines = readNamedLines([
      'Here is what fits.',
      'template: chain-supply - Shipments and inspections are its subject.',
      '- module: `intake` - Every arrival is recorded.',
      '2. Module: Inspection Sign Off: an inspector signs.',
      'application: Enterprise - private records across organisations',
      'Something else entirely.',
    ].join('\n'));
    expect(lines).toEqual([
      { kind: 'template', value: 'chain-supply', reason: 'Shipments and inspections are its subject.' },
      { kind: 'module', value: 'intake', reason: 'Every arrival is recorded.' },
      { kind: 'module', value: 'inspection sign off', reason: 'an inspector signs.' },
      { kind: 'application', value: 'enterprise', reason: 'private records across organisations' },
    ]);
  });
});

describe('matching named values against the catalogue', () => {
  it('finds a template by identifier or by title', () => {
    expect(matchTemplate('chain-supply', templates)?.id).toBe('chain-supply');
    expect(matchTemplate('Supply Chain', templates)?.id).toBe('chain-supply');
    expect(matchTemplate('absent', templates)).toBeNull();
  });

  it('finds a module by identifier or by title', () => {
    expect(matchModule('inspection sign off', modules)?.moduleId).toBe('inspection');
    expect(matchModule('INTAKE', modules)?.moduleId).toBe('intake');
    expect(matchModule('warehouse', modules)).toBeNull();
  });
});

describe('readIntelligenceReply', () => {
  it('builds a proposal from the named template and parts, with the track from the template', () => {
    const reading = readIntelligenceReply(
      'We track every shipment and let an inspector sign.',
      [
        'template: chain-supply - Shipments and inspections are its subject.',
        'module: intake - Every arrival is recorded',
        'module: inspection - An inspector signs before release.',
        'module: warehouse-robot - Robots move pallets.',
        'application: enterprise - Several organisations share the records.',
      ].join('\n'),
      { modules, templates },
    );
    expect(reading.proposal.empty).toBe(false);
    expect(reading.proposal.templates.map((entry) => entry.template.id)).toEqual(['chain-supply']);
    expect(reading.proposal.templates[0].reason).toBe('Shipments and inspections are its subject.');
    expect(reading.proposal.outcomes.map((entry) => entry.outcome.anchorModuleId)).toEqual(['intake', 'inspection']);
    expect(reading.proposal.outcomes[0].reason).toBe('Every arrival is recorded.');
    expect(reading.proposal.track.track).toBe('blockchain');
    expect(reading.proposal.track.reason).toContain('Supply Chain');
    expect(reading.applicationHint).toEqual({ application: 'enterprise', reason: 'Several organisations share the records.' });
    expect(reading.unmatched).toEqual(['warehouse-robot']);
  });

  it('answers empty when nothing named exists in the catalogue', () => {
    const reading = readIntelligenceReply('Sell shoes.', 'template: shoe-shop\nmodule: cart', { modules, templates });
    expect(reading.proposal.empty).toBe(true);
    expect(reading.unmatched).toEqual(['shoe-shop', 'cart']);
  });

  it('takes the track from the parts when no template was named', () => {
    const reading = readIntelligenceReply('Sell items.', 'module: listing - items go on sale', { modules, templates });
    expect(reading.proposal.track.track).toBe('dapp');
    expect(reading.proposal.outcomes[0].reason).toBe('items go on sale.');
  });
});
