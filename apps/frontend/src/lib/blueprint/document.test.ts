import { describe, expect, it } from 'vitest';

import {
  countSections,
  readBlueprintDocument,
  readCollections,
  readGovernance,
  readIntegrations,
} from './document';
import { BLUEPRINT_SCHEMA_VERSION, CLASS_THRESHOLDS } from './types';

const document = {
  schema_version: '1.0.0',
  name: 'Berth register',
  summary: 'A register of berths.',
  collections: [
    {
      id: 'berth',
      record_type: 'berth_record',
      primary_key: 'berth_id',
      indexes: [],
      privacy: 'Open',
      retention: { period_days: 3650, on_expiry: 'Archive' },
      purpose: { statement: 'We record every berth.', lawful_basis: 'PublicTask' },
      description: '',
    },
  ],
  identities: { units: [], roles: [{ id: 'owner', name: 'Owner', credentials: [] }], credentials: [], delegations: [] },
  governance: {
    authority: ['owner'],
    quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
    constitutional_delay_blocks: 28800,
    change_process: 'The owner proposes a change.',
  },
  integrations: { feeds: [], bridges: [{ id: 'b', target_network: 'x' }], triggers: [] },
};

describe('reading a Blueprint', () => {
  it('reads the governance section as the document holds it', () => {
    const governance = readGovernance(document);
    expect(governance.authority).toEqual(['owner']);
    expect(governance.quorum.financial).toBe(CLASS_THRESHOLDS.Financial);
  });

  it('fills the governance section when the document carries none', () => {
    const governance = readGovernance({});
    expect(governance.quorum.constitutional).toBe(90);
    expect(governance.constitutional_delay_blocks).toBe(28800);
    expect(governance.authority).toEqual([]);
  });

  it('fills every integrations list when the document carries none', () => {
    expect(readIntegrations(null)).toEqual({ feeds: [], bridges: [], triggers: [] });
    expect(readIntegrations(document).bridges).toHaveLength(1);
  });

  it('reads the collections and answers with an empty list on a broken value', () => {
    expect(readCollections(document)).toHaveLength(1);
    expect(readCollections({ collections: 'not a list' })).toEqual([]);
  });

  it('counts every section for a summary line', () => {
    const counts = countSections(document);
    expect(counts.collections).toBe(1);
    expect(counts.roles).toBe(1);
    expect(counts.bridges).toBe(1);
    expect(counts.actions).toBe(0);
  });

  it('gives a Blueprint with no role the owner role', () => {
    expect(readBlueprintDocument({}).identities.roles).toEqual([
      { id: 'owner', name: 'Owner', credentials: [] },
    ]);
  });

  it('reads a whole Blueprint with every section present', () => {
    const whole = readBlueprintDocument({});
    expect(whole.schema_version).toBe(BLUEPRINT_SCHEMA_VERSION);
    expect(whole.name).toBe('New system');
    expect(whole.collections).toEqual([]);
    expect(whole.economics).toBeNull();
    expect(whole.integrations.feeds).toEqual([]);
  });

  it('keeps every section the document already held', () => {
    const whole = readBlueprintDocument(document);
    expect(whole.name).toBe('Berth register');
    expect(whole.collections).toHaveLength(1);
    expect(whole.identities.roles).toHaveLength(1);
  });
});
