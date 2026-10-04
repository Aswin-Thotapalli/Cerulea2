import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from '@/lib/blueprint/document';
import { recordTypeOf } from '@/lib/blueprint/edit';
import { validateBlueprint } from '@/lib/blueprint/validate';
import type { Blueprint } from '@/lib/blueprint/types';
import {
  addRelationship,
  changeRelationshipKind,
  describeRelationship,
  relationshipsOf,
  removeRelationship,
} from './relationship-model';

function collection(id: string): Blueprint['collections'][number] {
  return {
    id,
    record_type: `${id}_record`,
    primary_key: 'id',
    indexes: [],
    privacy: 'Open',
    retention: { period_days: 3650, on_expiry: 'Archive' },
    purpose: { statement: `We keep every ${id} so the register stays provable.`, lawful_basis: 'Contract' },
    description: `Every ${id}.`,
  };
}

function record(id: string): Blueprint['types'][number] {
  return {
    id: `${id}_record`,
    kind: 'Record',
    description: `One ${id}.`,
    fields: [{ name: 'id', type: { kind: 'Text' }, required: true, validation: [], description: 'Key.' }],
  };
}

function base(): Blueprint {
  return readBlueprintDocument(
    {
      name: 'Berth register',
      types: [record('harbour'), record('berth'), record('vessel')],
      collections: [collection('harbour'), collection('berth'), collection('vessel')],
      identities: { roles: [{ id: 'clerk', name: 'Clerk', credentials: [] }] },
      actions: [
        {
          id: 'allocate_a_berth',
          name: 'Allocate a berth',
          params: [],
          preconditions: [],
          effects: [
            { kind: 'Insert', collection: 'berth', key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } }, value: { kind: 'Param', name: 'record' } },
          ],
          emits: [],
          class: 'Routine',
          roles: ['clerk'],
          description: 'Adds a berth.',
        },
      ],
    },
    'Berth register',
  );
}

describe('drawing a relationship', () => {
  it('writes a reference field and an index for one to many, and the action that writes the many side reads the one side', () => {
    const outcome = addRelationship(base(), { fromCollection: 'harbour', toCollection: 'berth', kind: 'one-to-many' });
    expect(outcome.relationship).toEqual({
      id: 'berth.harbour_id',
      fromCollection: 'harbour',
      toCollection: 'berth',
      kind: 'one-to-many',
      field: 'harbour_id',
    });
    const berth = outcome.blueprint.collections.find((entry) => entry.id === 'berth')!;
    const fields = recordTypeOf(outcome.blueprint, berth)!.fields;
    expect(fields.map((entry) => entry.name)).toEqual(['id', 'harbour_id']);
    expect(fields[1].type).toEqual({ kind: 'Reference', collection: 'harbour' });
    expect(berth.indexes).toEqual([{ id: 'berth_by_harbour_id', fields: ['harbour_id'], unique: false }]);
    const action = outcome.blueprint.actions[0];
    expect(action.effects[0]).toEqual(expect.objectContaining({ kind: 'Read', collection: 'harbour' }));
    expect(validateBlueprint(outcome.blueprint)).toEqual([]);
  });

  it('reads the relationship back out of the Blueprint', () => {
    const outcome = addRelationship(base(), { fromCollection: 'harbour', toCollection: 'berth', kind: 'one-to-one' });
    expect(relationshipsOf(outcome.blueprint)).toEqual([outcome.relationship]);
    expect(describeRelationship(outcome.relationship!)).toContain('One harbour has one berth');
  });

  it('adds a link collection for many to many and hides it from the boxes', () => {
    const outcome = addRelationship(base(), { fromCollection: 'vessel', toCollection: 'berth', kind: 'many-to-many' });
    expect(outcome.relationship?.field).toBe('vessel_berth_link');
    const link = outcome.blueprint.collections.find((entry) => entry.id === 'vessel_berth_link')!;
    expect(link.indexes[0]).toEqual({ id: 'vessel_berth_link_pair', fields: ['vessel_id', 'berth_id'], unique: true });
    expect(relationshipsOf(outcome.blueprint)).toEqual([
      expect.objectContaining({ kind: 'many-to-many', fromCollection: 'vessel', toCollection: 'berth' }),
    ]);
    expect(validateBlueprint(outcome.blueprint)).toEqual([]);
  });

  it('changes the kind and removes the relationship with its field', () => {
    const first = addRelationship(base(), { fromCollection: 'harbour', toCollection: 'berth', kind: 'one-to-many' });
    const unique = changeRelationshipKind(first.blueprint, first.relationship!, 'one-to-one');
    expect(unique.relationship?.kind).toBe('one-to-one');
    expect(unique.blueprint.collections.find((entry) => entry.id === 'berth')!.indexes[0].unique).toBe(true);

    const linked = changeRelationshipKind(unique.blueprint, unique.relationship!, 'many-to-many');
    expect(linked.relationship?.kind).toBe('many-to-many');
    expect(recordTypeOf(linked.blueprint, linked.blueprint.collections.find((entry) => entry.id === 'berth')!)!.fields).toHaveLength(1);

    const removed = removeRelationship(linked.blueprint, linked.relationship!);
    expect(relationshipsOf(removed)).toEqual([]);
    expect(removed.collections.map((entry) => entry.id)).toEqual(['harbour', 'berth', 'vessel']);
  });

  it('refuses a link from a collection to itself', () => {
    const outcome = addRelationship(base(), { fromCollection: 'berth', toCollection: 'berth', kind: 'one-to-many' });
    expect(outcome.relationship).toBeNull();
    expect(outcome.blueprint).toBe(outcome.blueprint);
  });
});
