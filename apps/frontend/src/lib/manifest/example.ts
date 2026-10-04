// apps/frontend/src/lib/manifest/example.ts
// One typed Deployment Manifest the tests read.
//
// The shape is large and every view reads it, so the tests share one value
// rather than each writing its own. No surface imports this module, so nothing
// a person sees is ever drawn from here.

import type { DeploymentManifest } from './types';

/** One manifest carrying at least one line in every one of the twelve groups. */
export const EXAMPLE_MANIFEST: DeploymentManifest = {
  manifest_version: '1.0.0',
  name: 'Berth register',
  blueprintHash: 'hash-current',
  genesisHash: 'genesis-1',
  descriptionHash: 'description-1',
  summary: {
    collections: 2,
    fields: 5,
    indexes: 1,
    actions: 2,
    workflows: 1,
    states: 3,
    transitions: 2,
    rules: 1,
    permissionEntries: 2,
    interfaces: 1,
    endpoints: 3,
    webhooks: 1,
    modules: 6,
  },
  data: [
    {
      collection: 'booking',
      field: 'berth',
      type: 'Text',
      required: true,
      defaultValue: undefined,
      validation: ['MaxLength 40'],
      storageClass: 'OnChain',
      privacyClass: 'Open',
      indexes: ['by_berth'],
      relationships: [],
    },
    {
      collection: 'booking',
      field: 'amount',
      type: 'Decimal with 2 places',
      required: false,
      defaultValue: '0',
      validation: [],
      storageClass: 'OnChain',
      privacyClass: 'Open',
      indexes: [],
      relationships: ['References account'],
    },
  ],
  actions: [
    {
      action: 'record_booking',
      name: 'Record booking',
      parameters: [{ name: 'berth', type: 'Text', required: true }],
      preconditions: ['The berth is free.'],
      effects: ['Adds a record to booking'],
      emits: ['booking_recorded'],
      roles: ['clerk'],
      transactionClass: 'Routine',
      threshold: 51,
      mandatoryDelay: false,
    },
  ],
  workflows: [
    {
      workflow: 'booking_flow',
      name: 'Booking flow',
      states: [
        { id: 'opened', name: 'Opened', terminal: false },
        { id: 'closed', name: 'Closed', terminal: true },
      ],
      transitions: [{ id: 'close', from: 'opened', to: 'closed', guard: 'amount is settled' }],
      timers: [{ id: 'lapse', state: 'opened', afterSeconds: 86400, action: 'close_booking' }],
    },
  ],
  rules: [
    {
      rule: 'berth_free',
      kind: 'Precondition',
      plainStatement: 'A berth takes one booking at a time.',
      formalStatement: 'count(booking where berth = berth) = 0',
      collections: ['booking'],
    },
  ],
  permissions: [
    {
      role: 'clerk',
      collection: 'booking',
      capabilities: ['Create', 'Read'],
      fields: ['every field'],
      rowQualification: 'every row',
    },
  ],
  interfaces: [
    {
      view: 'booking_list',
      name: 'Every booking',
      collection: 'booking',
      boundFields: ['berth', 'amount'],
      actions: ['record_booking'],
      roles: ['clerk'],
    },
  ],
  integration: [
    {
      method: 'GET',
      path: '/booking',
      parameters: ['page in query'],
      response: 'A page of booking records',
      visibility: 'clerk',
    },
  ],
  chain: {
    consensusProfile: 'Balanced',
    consequence: 'The balanced profile holds agreement time and throughput together.',
    validatorSeats: 7,
    classTable: [
      { transactionClass: 'Routine', threshold: 51, mandatoryDelay: false },
      { transactionClass: 'Constitutional', threshold: 90, mandatoryDelay: true },
    ],
    governanceAuthority: ['harbour_board'],
    changeProcess: 'The authority roles agree before a change takes effect.',
    constitutionalDelayBlocks: 100,
  },
  infrastructure: {
    target: 'cerulea-managed',
    nodeCount: 7,
    storageGigabytes: 100,
    domains: [],
    certificates: [],
    backupSchedule: 'A full copy each day and a change log every hour.',
  },
  security: [
    {
      collection: 'booking',
      encryption: 'Encryption at rest across chain storage and backups',
      keyCustody: 'Hardware security module custody for signing keys',
      authentication: 'Multi-factor on every account with short-lived rotating tokens',
      retention: '900 days, then archive',
      auditScope: 'Every read and write against booking appears in the audit log',
    },
  ],
  modules: [
    {
      module: 'schema',
      outcome: 'The deployment holds typed records.',
      links: [{ target: 'booking', kind: 'collection' }],
    },
  ],
  cost: {
    tier: 'starter',
    monthlyMinor: 900000,
    currency: 'INR',
    addOns: [{ name: 'Extra storage', monthlyMinor: 100000 }],
    storageGigabytes: 100,
    nodeCount: 7,
  },
  manifestHash: 'manifest-1',
};
