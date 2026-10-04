// apps/frontend/src/components/studio/relationships/relationship-model.ts
// Relationships between collections, read from and written to the Blueprint.
// A relationship is a link one record keeps to another. The Blueprint holds it
// as a reference field: a field whose type names the other collection. One to
// one adds a unique index on that field. Many to many adds a link collection
// holding one reference each way. The relationship canvas draws these and
// nothing else, so the picture and the document never drift apart.
// An action that writes a collection holding a reference reads the collection
// the reference names, so the Access Manifest of the action carries that read.
// Without this module the canvas would draw lines the chain never sees.

import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import { putCollection, putFields, recordTypeOf } from '@/lib/blueprint/edit';
import type {
  Blueprint,
  Collection,
  Effect,
  RecordField,
  RecordTypeDefinition,
  TypeExpression,
} from '@/lib/blueprint/types';

export type RelationshipKind = 'one-to-one' | 'one-to-many' | 'many-to-many';

export const RELATIONSHIP_KINDS: { kind: RelationshipKind; label: string; meaning: string }[] = [
  {
    kind: 'one-to-many',
    label: 'One to many',
    meaning: 'One record on the first side owns many on the second. The second side keeps the link.',
  },
  {
    kind: 'one-to-one',
    label: 'One to one',
    meaning: 'One record on each side. The second side keeps the link, and no two records share it.',
  },
  {
    kind: 'many-to-many',
    label: 'Many to many',
    meaning: 'Any number on each side. A link collection keeps one pair per row.',
  },
];

export type Relationship = {
  /** The reference field path, `collection.field`, or the link collection id. */
  id: string;
  /** The collection on the one side, or the first side of a many to many. */
  fromCollection: string;
  /** The collection that keeps the reference, or the second side of a many to many. */
  toCollection: string;
  kind: RelationshipKind;
  /** The reference field on the to side, or the link collection for many to many. */
  field: string;
};

const LINK_SUFFIX = '_link';

function referenceTarget(type: TypeExpression): string | null {
  if (type.kind === 'Reference') return type.collection;
  if (type.kind === 'Optional' && type.inner.kind === 'Reference') return type.inner.collection;
  return null;
}

function referenceFields(record: RecordTypeDefinition): { field: RecordField; target: string }[] {
  return record.fields
    .map((field) => ({ field, target: referenceTarget(field.type) }))
    .filter((entry): entry is { field: RecordField; target: string } => entry.target !== null);
}

function isLinkCollection(collection: Collection, record: RecordTypeDefinition | null): boolean {
  return (
    collection.id.endsWith(LINK_SUFFIX) &&
    record !== null &&
    referenceFields(record).length === 2
  );
}

/** Reads every relationship the Blueprint holds. */
export function relationshipsOf(blueprint: Blueprint): Relationship[] {
  const held: Relationship[] = [];
  for (const collection of blueprint.collections) {
    const record = recordTypeOf(blueprint, collection);
    if (!record) continue;
    const references = referenceFields(record);
    if (isLinkCollection(collection, record)) {
      const [first, second] = references;
      held.push({
        id: collection.id,
        fromCollection: first.target,
        toCollection: second.target,
        kind: 'many-to-many',
        field: collection.id,
      });
      continue;
    }
    for (const { field, target } of references) {
      const unique = collection.indexes.some(
        (index) => index.unique && index.fields.length === 1 && index.fields[0] === field.name,
      );
      held.push({
        id: `${collection.id}.${field.name}`,
        fromCollection: target,
        toCollection: collection.id,
        kind: unique ? 'one-to-one' : 'one-to-many',
        field: field.name,
      });
    }
  }
  return held;
}

/** Names the reference field one collection keeps towards another. */
export function referenceFieldName(record: RecordTypeDefinition, fromCollection: string): string {
  const base = `${fromCollection}_id`;
  if (record.fields.some((field) => field.name === base) === false) return base;
  let count = 2;
  while (record.fields.some((field) => field.name === `${base}_${count}`)) count += 1;
  return `${base}_${count}`;
}

function indexId(collectionId: string, fieldName: string): string {
  return `${collectionId}_by_${fieldName}`;
}

/**
 * Adds the read an action needs once a collection it writes holds a reference.
 * Every action writing `toCollection` reads `fromCollection`, so the Access
 * Manifest declares the record the reference is checked against.
 */
export function carryReferenceReads(
  blueprint: Blueprint,
  toCollection: string,
  fromCollection: string,
): Blueprint {
  const writes = (effects: Effect[]): boolean =>
    effects.some(
      (effect) =>
        ((effect.kind === 'Insert' || effect.kind === 'Update') && effect.collection === toCollection) ||
        (effect.kind === 'Compensate' && writes(effect.effects)),
    );
  const reads = (effects: Effect[]): boolean =>
    effects.some(
      (effect) =>
        (effect.kind === 'Read' && effect.collection === fromCollection) ||
        (effect.kind === 'Compensate' && reads(effect.effects)),
    );
  return {
    ...blueprint,
    actions: blueprint.actions.map((action) =>
      writes(action.effects) && reads(action.effects) === false
        ? {
            ...action,
            effects: [
              {
                kind: 'Read',
                collection: fromCollection,
                key: { kind: 'Full' },
                bind: `held_${fromCollection}`,
              },
              ...action.effects,
            ],
          }
        : action,
    ),
  };
}

/** Adds one relationship, writing the reference field, the index or the link collection. */
export function addRelationship(
  blueprint: Blueprint,
  input: { fromCollection: string; toCollection: string; kind: RelationshipKind },
): { blueprint: Blueprint; relationship: Relationship | null } {
  const from = blueprint.collections.find((entry) => entry.id === input.fromCollection);
  const to = blueprint.collections.find((entry) => entry.id === input.toCollection);
  if (!from || !to || from.id === to.id) return { blueprint, relationship: null };

  if (input.kind === 'many-to-many') {
    const linkId = `${from.id}_${to.id}${LINK_SUFFIX}`;
    if (blueprint.collections.some((entry) => entry.id === linkId)) {
      return { blueprint, relationship: relationshipsOf(blueprint).find((r) => r.id === linkId) ?? null };
    }
    const recordId = `${linkId}_record`;
    const firstField = `${from.id}_id`;
    const secondField = from.id === to.id ? `${to.id}_id_2` : `${to.id}_id`;
    const withType: Blueprint = {
      ...blueprint,
      types: [
        ...blueprint.types,
        {
          id: recordId,
          kind: 'Record',
          description: `One link between a ${toReadable(from.id).toLowerCase()} and a ${toReadable(to.id).toLowerCase()}.`,
          fields: [
            {
              name: 'id',
              type: { kind: 'Text' },
              required: true,
              validation: [],
              description: 'The key Cerulea gives one link.',
            },
            {
              name: firstField,
              type: { kind: 'Reference', collection: from.id },
              required: true,
              validation: [],
              description: `The ${toReadable(from.id).toLowerCase()} this link names.`,
            },
            {
              name: secondField,
              type: { kind: 'Reference', collection: to.id },
              required: true,
              validation: [],
              description: `The ${toReadable(to.id).toLowerCase()} this link names.`,
            },
          ],
        },
      ],
    };
    const linked = putCollection(withType, {
      id: linkId,
      record_type: recordId,
      primary_key: 'id',
      indexes: [{ id: `${linkId}_pair`, fields: [firstField, secondField], unique: true }],
      privacy: 'Open',
      retention: { ...to.retention },
      purpose: {
        statement: `We keep every link between a ${toReadable(from.id).toLowerCase()} and a ${toReadable(to.id).toLowerCase()} so both sides stay provable.`,
        lawful_basis: to.purpose.lawful_basis,
      },
      description: `Every link between a ${toReadable(from.id).toLowerCase()} and a ${toReadable(to.id).toLowerCase()}.`,
    });
    const carried = carryReferenceReads(carryReferenceReads(linked, linkId, from.id), linkId, to.id);
    return {
      blueprint: carried,
      relationship: { id: linkId, fromCollection: from.id, toCollection: to.id, kind: 'many-to-many', field: linkId },
    };
  }

  const record = recordTypeOf(blueprint, to);
  if (!record) return { blueprint, relationship: null };
  const fieldName = referenceFieldName(record, from.id);
  const field: RecordField = {
    name: fieldName,
    type: { kind: 'Reference', collection: from.id },
    required: true,
    validation: [],
    description: `The ${toReadable(from.id).toLowerCase()} this ${toReadable(to.id).toLowerCase()} belongs to.`,
  };
  const withField = putFields(blueprint, record.id, [...record.fields, field]);
  const withIndex = putCollection(withField, {
    ...to,
    indexes: [
      ...to.indexes.filter((index) => index.id !== indexId(to.id, fieldName)),
      { id: indexId(to.id, fieldName), fields: [fieldName], unique: input.kind === 'one-to-one' },
    ],
  });
  return {
    blueprint: carryReferenceReads(withIndex, to.id, from.id),
    relationship: {
      id: `${to.id}.${fieldName}`,
      fromCollection: from.id,
      toCollection: to.id,
      kind: input.kind,
      field: fieldName,
    },
  };
}

/** Removes one relationship with its field, its index or its link collection. */
export function removeRelationship(blueprint: Blueprint, relationship: Relationship): Blueprint {
  if (relationship.kind === 'many-to-many') {
    const link = blueprint.collections.find((entry) => entry.id === relationship.field);
    if (!link) return blueprint;
    return {
      ...blueprint,
      collections: blueprint.collections.filter((entry) => entry.id !== link.id),
      types: blueprint.types.filter((entry) => entry.id !== link.record_type),
      permissions: blueprint.permissions.filter((entry) => entry.collection !== link.id),
      workflows: blueprint.workflows.filter((entry) => entry.collection !== link.id),
    };
  }
  const to = blueprint.collections.find((entry) => entry.id === relationship.toCollection);
  const record = to ? recordTypeOf(blueprint, to) : null;
  if (!to || !record) return blueprint;
  const fields = record.fields.filter((field) => field.name !== relationship.field);
  const withFields = putFields(blueprint, record.id, fields.length > 0 ? fields : record.fields);
  return putCollection(withFields, {
    ...to,
    indexes: to.indexes.filter(
      (index) => index.fields.includes(relationship.field) === false,
    ),
  });
}

/** Changes the kind of one relationship. */
export function changeRelationshipKind(
  blueprint: Blueprint,
  relationship: Relationship,
  kind: RelationshipKind,
): { blueprint: Blueprint; relationship: Relationship | null } {
  if (relationship.kind === kind) return { blueprint, relationship };
  if (relationship.kind !== 'many-to-many' && kind !== 'many-to-many') {
    const to = blueprint.collections.find((entry) => entry.id === relationship.toCollection);
    if (!to) return { blueprint, relationship: null };
    const next = putCollection(blueprint, {
      ...to,
      indexes: [
        ...to.indexes.filter((index) => index.id !== indexId(to.id, relationship.field)),
        { id: indexId(to.id, relationship.field), fields: [relationship.field], unique: kind === 'one-to-one' },
      ],
    });
    return { blueprint: next, relationship: { ...relationship, kind } };
  }
  const removed = removeRelationship(blueprint, relationship);
  return addRelationship(removed, {
    fromCollection: relationship.fromCollection,
    toCollection: relationship.toCollection,
    kind,
  });
}

/** States one relationship in the words a person reads. */
export function describeRelationship(relationship: Relationship): string {
  const from = toReadable(relationship.fromCollection);
  const to = toReadable(relationship.toCollection);
  switch (relationship.kind) {
    case 'one-to-one':
      return `One ${from.toLowerCase()} has one ${to.toLowerCase()}. ${to} keeps the link in ${toReadable(relationship.field).toLowerCase()}, and no two share it.`;
    case 'one-to-many':
      return `One ${from.toLowerCase()} has many ${to.toLowerCase()} records. Each one keeps the link in ${toReadable(relationship.field).toLowerCase()}.`;
    default:
      return `Any ${from.toLowerCase()} links to any ${to.toLowerCase()}. The ${toReadable(relationship.field).toLowerCase()} collection keeps one pair per row.`;
  }
}

/** Makes a canvas identifier out of a collection id, so a node id stays a plain string. */
export function nodeIdFor(collectionId: string): string {
  return toIdentifier(collectionId);
}
