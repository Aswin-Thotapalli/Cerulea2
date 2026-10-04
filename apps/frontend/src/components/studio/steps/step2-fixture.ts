// apps/frontend/src/components/studio/steps/step2-fixture.ts
// One small Blueprint the Data schema tests build on: a harbour register
// with a harbour, its berths and a clerk. Every test starts from this
// document and reads what each panel wrote back into it.

import { readBlueprintDocument } from '@/lib/blueprint/document';
import type { Blueprint, Collection, RecordField, TypeDefinition } from '@/lib/blueprint/types';

export function fixtureCollection(id: string, over: Partial<Collection> = {}): Collection {
  return {
    id,
    record_type: `${id}_record`,
    primary_key: 'id',
    indexes: [],
    privacy: 'Open',
    retention: { period_days: 3650, on_expiry: 'Archive' },
    purpose: { statement: `We keep every ${id} so the register stays provable.`, lawful_basis: 'Contract' },
    description: `Every ${id} the register keeps.`,
    ...over,
  };
}

export function fixtureRecord(id: string, extra: RecordField[] = []): TypeDefinition {
  return {
    id: `${id}_record`,
    kind: 'Record',
    description: `One ${id}.`,
    fields: [
      { name: 'id', type: { kind: 'Text' }, required: true, validation: [], description: 'The key.' },
      ...extra,
    ],
  };
}

export function harbourRegister(): Blueprint {
  return readBlueprintDocument(
    {
      name: 'Harbour register',
      types: [
        fixtureRecord('harbour', [
          { name: 'name', type: { kind: 'Text' }, required: true, validation: [], description: 'The name.' },
        ]),
        fixtureRecord('berth', [
          { name: 'length', type: { kind: 'Integer' }, required: true, validation: [], description: 'Length in metres.' },
          { name: 'status', type: { kind: 'Text' }, required: true, validation: [], description: 'Where the berth stands.' },
        ]),
      ],
      collections: [fixtureCollection('harbour'), fixtureCollection('berth')],
      identities: {
        roles: [
          { id: 'clerk', name: 'Clerk', credentials: [] },
          { id: 'harbour_master', name: 'Harbour master', credentials: [] },
        ],
      },
      permissions: [{ id: 'clerk_on_berth', role: 'clerk', collection: 'berth', capabilities: ['Read'], fields: [] }],
      actions: [
        {
          id: 'allocate_a_berth',
          name: 'Allocate a berth',
          params: [],
          preconditions: [],
          effects: [
            {
              kind: 'Insert',
              collection: 'berth',
              key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } },
              value: { kind: 'Param', name: 'record' },
            },
          ],
          emits: [],
          class: 'Routine',
          roles: ['clerk'],
          description: 'Adds a berth to the register.',
        },
      ],
    },
    'Harbour register',
  );
}
