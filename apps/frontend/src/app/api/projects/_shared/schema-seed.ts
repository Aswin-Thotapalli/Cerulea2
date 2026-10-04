// apps/frontend/src/app/api/projects/_shared/schema-seed.ts
// The first content of the Data schema step.
// A project opens populated: the modules the Blueprint step chose bring their
// entity presets into the Types and Collections sections, and a project
// imported from the earlier Studio brings the entities it saved there. The
// seed runs once, when the Blueprint holds no collection yet.
// Without this module the Data schema step would open on an empty screen.

import { applyComposition, composeSections, toIdentifier } from '@/lib/blueprint/compose';
import type {
  Blueprint,
  Collection,
  PrivacyClass,
  RecordField,
  RecordTypeDefinition,
  TypeDefinition,
  TypeExpression,
} from '@/lib/blueprint/types';

/** Field names whose presence marks a collection as sealed on the chain. */
const SEALED_FIELD_NAMES = new Set(['email', 'password', 'private_key', 'secret', 'token']);

/**
 * Carries the inferences the earlier Studio made from field names.
 * A field naming another record is indexed. A collection holding a secret or
 * a personal address is sealed, so a reader needs the key as well as the
 * permission.
 */
export function enrichComposition(blueprint: Blueprint): Blueprint {
  const collections = blueprint.collections.map((collection) => {
    const recordType = blueprint.types.find(
      (entry): entry is RecordTypeDefinition =>
        entry.id === collection.record_type && entry.kind === 'Record',
    );
    if (!recordType) return collection;
    const indexed = recordType.fields.filter(
      (field) =>
        field.name !== collection.primary_key &&
        (innerKind(field.type) === 'Reference' || field.name.endsWith('_id')),
    );
    const held = new Set(collection.indexes.map((entry) => entry.id));
    const added = indexed
      .filter((field) => held.has(`${collection.id}_by_${field.name}`) === false)
      .map((field) => ({ id: `${collection.id}_by_${field.name}`, fields: [field.name], unique: false }));
    const sealed = recordType.fields.some((field) => SEALED_FIELD_NAMES.has(field.name));
    const privacy: PrivacyClass =
      collection.privacy === 'Open' && sealed ? 'Encrypted' : collection.privacy;
    return { ...collection, indexes: [...collection.indexes, ...added], privacy };
  });
  return { ...blueprint, collections };
}

function innerKind(type: TypeExpression): TypeExpression['kind'] {
  return type.kind === 'Optional' ? type.inner.kind : type.kind;
}

/** Composes the presets of the chosen modules into a Blueprint holding no collection. */
export function seedFromModules(
  blueprint: Blueprint,
  moduleIds: string[],
  retentionDays: number,
): Blueprint {
  if (moduleIds.length === 0) return blueprint;
  const composed = composeSections(moduleIds, { retentionDays });
  return enrichComposition(applyComposition(blueprint, composed, []));
}

/* The earlier Studio's saved schema -------------------------------------- */

/** One field as the earlier Studio saved it under schema::document. */
export type EarlierField = {
  name: string;
  type: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  encrypted?: boolean;
  description?: string;
  defaultValue?: string;
  options?: string[];
};

/** One entity as the earlier Studio saved it. */
export type EarlierEntity = {
  name: string;
  description?: string;
  fields: EarlierField[];
  moduleId?: string;
  onChain?: boolean;
  apiPublic?: boolean;
};

/** Maps one earlier field type onto the Blueprint primitive set. */
export function earlierFieldType(field: EarlierField, enumerationId?: string): TypeExpression {
  switch (field.type) {
    case 'int':
    case 'uint256':
      return { kind: 'Integer' };
    case 'float':
      return { kind: 'Decimal', scale: 2 };
    case 'boolean':
      return { kind: 'Boolean' };
    case 'datetime':
    case 'date':
      return { kind: 'Timestamp' };
    case 'address':
      return { kind: 'Identity' };
    case 'bytes32':
    case 'ipfs-hash':
      return { kind: 'Hash' };
    case 'file':
      return { kind: 'Bytes' };
    case 'json':
      return { kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Text' } };
    case 'enum':
      return enumerationId ? { kind: 'Named', name: enumerationId } : { kind: 'Text' };
    default:
      return { kind: 'Text' };
  }
}

/** Reads the entity list the earlier Studio saved, or nothing. */
export function earlierEntitiesOf(saved: unknown): EarlierEntity[] {
  const held = saved && typeof saved === 'object' ? (saved as { entities?: unknown }).entities : null;
  if (!Array.isArray(held)) return [];
  return held.filter(
    (entry): entry is EarlierEntity =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as EarlierEntity).name === 'string' &&
      Array.isArray((entry as EarlierEntity).fields),
  );
}

/**
 * Turns the earlier Studio's entities into Types and Collections.
 * Every field keeps its name, its required mark and its description. A unique
 * field becomes a unique index. An encrypted field seals the collection. A
 * pick list becomes a named enumeration.
 */
export function seedFromEarlierEntities(
  blueprint: Blueprint,
  entities: EarlierEntity[],
  retentionDays: number,
): { blueprint: Blueprint; placement: Record<string, string> } {
  const types: TypeDefinition[] = [];
  const collections: Collection[] = [];
  const placement: Record<string, string> = {};
  const seen = new Set(blueprint.collections.map((entry) => entry.id));

  for (const entity of entities) {
    const collectionId = toIdentifier(entity.name);
    if (seen.has(collectionId)) continue;
    seen.add(collectionId);
    const recordTypeId = `${collectionId}_record`;
    const fields: RecordField[] = [];
    const indexes: Collection['indexes'] = [];
    let sealed = false;
    for (const field of entity.fields) {
      if (typeof field?.name !== 'string' || field.name.length === 0) continue;
      const fieldId = toIdentifier(field.name);
      if (fields.some((entry) => entry.name === fieldId)) continue;
      let enumerationId: string | undefined;
      if (field.type === 'enum' && Array.isArray(field.options) && field.options.length > 0) {
        enumerationId = `${collectionId}_${fieldId}`;
        types.push({
          id: enumerationId,
          kind: 'Enumeration',
          variants: field.options.map(toIdentifier),
          description: `The values ${fieldId.replace(/_/g, ' ')} takes.`,
        });
      }
      const base = earlierFieldType(field, enumerationId);
      fields.push({
        name: fieldId,
        type: field.required === false && fieldId !== 'id' ? { kind: 'Optional', inner: base } : base,
        required: field.required !== false || fieldId === 'id',
        validation: [],
        description: field.description ?? `The ${fieldId.replace(/_/g, ' ')} of this record.`,
      });
      if (field.unique && fieldId !== 'id') {
        indexes.push({ id: `${collectionId}_by_${fieldId}`, fields: [fieldId], unique: true });
      } else if (field.indexed && fieldId !== 'id') {
        indexes.push({ id: `${collectionId}_by_${fieldId}`, fields: [fieldId], unique: false });
      }
      if (field.encrypted) sealed = true;
    }
    if (fields.length === 0) {
      fields.push({
        name: 'id',
        type: { kind: 'Text' },
        required: true,
        validation: [],
        description: 'The key Cerulea gives one record.',
      });
    }
    types.push({
      id: recordTypeId,
      kind: 'Record',
      fields,
      description: `One ${entity.name.toLowerCase()} record.`,
    });
    collections.push({
      id: collectionId,
      record_type: recordTypeId,
      primary_key: fields.some((entry) => entry.name === 'id') ? 'id' : fields[0].name,
      indexes,
      privacy: sealed ? 'Encrypted' : entity.onChain === false ? 'External' : 'Open',
      retention: { period_days: retentionDays, on_expiry: 'Archive' },
      purpose: {
        statement: `We keep every ${entity.name.toLowerCase()} record so the system stays provable.`,
        lawful_basis: 'Contract',
      },
      description: entity.description?.trim() || `Every ${entity.name.toLowerCase()} the system keeps.`,
    });
    if (entity.moduleId) placement[collectionId] = entity.moduleId;
  }

  return {
    blueprint: {
      ...blueprint,
      types: [...blueprint.types, ...types],
      collections: [...blueprint.collections, ...collections],
    },
    placement,
  };
}
