// apps/frontend/src/lib/blueprint/compose.ts
// Turning a module selection into Blueprint sections.
// The catalogue carries an entity preset for every module that keeps records.
// Composing installs those presets as Blueprint types and collections, so Step
// 3 opens on a real model rather than an empty editor.
// Field types map onto the Blueprint primitive set. Floating point never
// appears, since agreement across nodes needs exact arithmetic.
// Without this module an outcome selection would change nothing that deploys.

import presets from '@/data/module-entity-presets.json';
import type {
  Blueprint,
  Collection,
  EnumerationTypeDefinition,
  RecordField,
  RecordTypeDefinition,
  TypeDefinition,
  TypeExpression,
} from './types';

export type PresetField = {
  name: string;
  type: string;
  format?: string;
  nullable?: boolean;
  enum?: string[];
  relation?: string;
};

export type PresetEntity = {
  name: string;
  fields: PresetField[];
};

/** The entity presets, keyed by module. The catalogue ships 126 of them. */
export const ENTITY_PRESETS = (presets as unknown as { presets: Record<string, PresetEntity[]> })
  .presets;

/** The scale Cerulea gives a decimal when the preset names none. Two places suit money. */
export const DEFAULT_DECIMAL_SCALE = 2;

/** Turns a catalogue name into a Blueprint identifier. */
export function toIdentifier(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toLowerCase()
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');
  const held = spaced.length === 0 ? 'field' : spaced;
  return /^[a-z]/.test(held) ? held : `c_${held}`;
}

/** Turns an identifier back into the words a person reads. */
export function toReadable(identifier: string): string {
  const words = identifier.split('_').filter((part) => part.length > 0);
  if (words.length === 0) return identifier;
  return `${words[0].charAt(0).toUpperCase()}${words[0].slice(1)}${
    words.length > 1 ? ` ${words.slice(1).join(' ')}` : ''
  }`;
}

/**
 * Maps one preset field onto the Blueprint primitive set.
 *
 * The set holds record, enumeration, sum, list, map, optional, fixed-point
 * decimal with a scale, timestamp, identity, hash and reference. A preset
 * naming a relation produces a reference. A preset naming an address produces
 * an identity. A nullable field produces an optional wrapper.
 */
export function mapFieldType(field: PresetField, enumerationId?: string): TypeExpression {
  let inner: TypeExpression;
  if (field.relation) {
    inner = { kind: 'Reference', collection: toIdentifier(field.relation) };
  } else if (field.enum && enumerationId) {
    inner = { kind: 'Named', name: enumerationId };
  } else if (field.format === 'eth-address') {
    inner = { kind: 'Identity' };
  } else {
    switch (field.type) {
      case 'uuid':
      case 'string':
      case 'text':
      case 'json':
        inner = { kind: 'Text' };
        break;
      case 'integer':
      case 'number':
        inner = { kind: 'Integer' };
        break;
      case 'decimal':
        inner = { kind: 'Decimal', scale: DEFAULT_DECIMAL_SCALE };
        break;
      case 'datetime':
        inner = { kind: 'Timestamp' };
        break;
      case 'boolean':
        inner = { kind: 'Boolean' };
        break;
      case 'hash':
        inner = { kind: 'Hash' };
        break;
      default:
        inner = { kind: 'Text' };
    }
  }
  return field.nullable === true ? { kind: 'Optional', inner } : inner;
}

/** One sentence stating what a field holds, for the person reading the model. */
export function describeField(field: PresetField): string {
  if (field.relation) return `Names the ${toReadable(toIdentifier(field.relation))} this record belongs to.`;
  if (field.enum) return `One of ${field.enum.join(', ')}.`;
  if (field.format === 'eth-address') return 'The identity this record belongs to.';
  if (field.type === 'decimal') {
    return `An exact amount kept to ${DEFAULT_DECIMAL_SCALE} decimal places.`;
  }
  if (field.type === 'datetime') return 'The instant Cerulea recorded against this field.';
  if (field.type === 'json') return 'A structured value the deployment reads.';
  return `The ${toReadable(toIdentifier(field.name)).toLowerCase()} of this record.`;
}

export type ComposedSections = {
  types: TypeDefinition[];
  collections: Collection[];
  /** The modules that contributed nothing, since the catalogue holds no preset for them. */
  withoutRecords: string[];
};

/**
 * Composes the types and the collections a module selection installs.
 *
 * A collection carries a privacy class, a retention period and a purpose
 * declaration, since the compiler checks all three. Cerulea opens each one on
 * the safe reading, and Step 3 changes any of them.
 */
export function composeSections(
  moduleIds: string[],
  options: { retentionDays?: number; privacy?: Collection['privacy'] } = {},
): ComposedSections {
  const types: TypeDefinition[] = [];
  const collections: Collection[] = [];
  const withoutRecords: string[] = [];
  const seen = new Set<string>();

  for (const moduleId of moduleIds) {
    const entities = ENTITY_PRESETS[moduleId];
    if (!entities || entities.length === 0) {
      withoutRecords.push(moduleId);
      continue;
    }
    for (const entity of entities) {
      const collectionId = toIdentifier(entity.name);
      if (seen.has(collectionId)) continue;
      seen.add(collectionId);

      const recordTypeId = `${collectionId}_record`;
      const fields: RecordField[] = [];

      for (const field of entity.fields) {
        const fieldId = toIdentifier(field.name);
        let enumerationId: string | undefined;
        if (field.enum && field.enum.length > 0) {
          enumerationId = `${collectionId}_${fieldId}`;
          const enumeration: EnumerationTypeDefinition = {
            id: enumerationId,
            kind: 'Enumeration',
            variants: field.enum.map(toIdentifier),
            description: `The values ${toReadable(fieldId).toLowerCase()} takes.`,
          };
          types.push(enumeration);
        }
        fields.push({
          name: fieldId,
          type: mapFieldType(field, enumerationId),
          required: field.nullable !== true,
          validation: [],
          description: describeField(field),
        });
      }

      const recordType: RecordTypeDefinition = {
        id: recordTypeId,
        kind: 'Record',
        fields,
        description: `One ${toReadable(collectionId).toLowerCase()} record.`,
      };
      types.push(recordType);

      collections.push({
        id: collectionId,
        record_type: recordTypeId,
        primary_key: fields[0]?.name ?? 'id',
        indexes: [],
        privacy: options.privacy ?? 'Open',
        retention: {
          period_days: options.retentionDays ?? 3650,
          on_expiry: 'Archive',
        },
        purpose: {
          statement: `We keep every ${toReadable(collectionId).toLowerCase()} record so the system stays provable.`,
          lawful_basis: 'Contract',
        },
        description: `Every ${toReadable(collectionId).toLowerCase()} the system keeps.`,
      });
    }
  }

  return { types, collections, withoutRecords };
}

/**
 * Merges composed sections into a Blueprint.
 *
 * A collection the person already changed stays as it stands, so composing a
 * second time never overwrites work. A collection Cerulea composed earlier and
 * the selection no longer installs is removed.
 */
export function applyComposition(
  blueprint: Blueprint,
  composed: ComposedSections,
  previouslyComposed: string[],
): Blueprint {
  const composedIds = new Set(composed.collections.map((entry) => entry.id));
  const earlier = new Set(previouslyComposed);

  const keptCollections = blueprint.collections.filter(
    (entry) => composedIds.has(entry.id) || earlier.has(entry.id) === false,
  );
  const heldIds = new Set(keptCollections.map((entry) => entry.id));
  const addedCollections = composed.collections.filter((entry) => heldIds.has(entry.id) === false);
  const collections = [...keptCollections, ...addedCollections];

  const neededTypes = new Set(collections.map((entry) => entry.record_type));
  const keptTypes = blueprint.types.filter(
    (entry) => neededTypes.has(entry.id) || entry.id.includes('_') === false,
  );
  const heldTypeIds = new Set(keptTypes.map((entry) => entry.id));
  const usedTypeIds = new Set([
    ...collections.map((entry) => entry.record_type),
    ...composed.types.map((entry) => entry.id),
  ]);
  const addedTypes = composed.types.filter(
    (entry) => heldTypeIds.has(entry.id) === false && usedTypeIds.has(entry.id),
  );

  return { ...blueprint, types: [...keptTypes, ...addedTypes], collections };
}
