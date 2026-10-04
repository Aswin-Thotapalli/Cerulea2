// apps/frontend/src/components/studio/steps/step2-model.ts
// The reading of the Blueprint the Data schema step works on.
// The step keeps the production layout: modules in a sidebar with their
// entities, a field grid, access pills, logic cards and an exposure table.
// Every one of those reads and writes the typed Blueprint. This module holds
// the pure functions that translate between the two: which module a
// collection sits under, what a production column means in Blueprint terms,
// and the typed entries a recommended trigger writes.
// Without this module each panel would reach into the document by hand.

import modulesSeed from '@/data/modules.seed.json';

import { ENTITY_PRESETS, toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  FIELD_KINDS,
  putCollection,
  putFields,
  putRole,
  putType,
  recordTypeOf,
  setCapabilities,
} from '@/lib/blueprint/edit';
import type {
  Blueprint,
  Collection,
  LiteralValue,
  RecordField,
  TypeExpression,
} from '@/lib/blueprint/types';
import type { ModuleInfo } from './step2-types';

/* Modules and placement ------------------------------------------------------ */

type SeedModule = { moduleId: string; title: string; category?: string };

const MODULES = ((modulesSeed as unknown as { modules?: SeedModule[] }).modules ?? []).reduce(
  (held, entry) => held.set(entry.moduleId, entry),
  new Map<string, SeedModule>(),
);

/** The module that stands for collections no module brought. */
export const CUSTOM_MODULE: ModuleInfo = { id: '_custom', label: 'Added by hand', category: 'custom' };

/** Reads the sidebar label of one module. */
export function moduleInfo(moduleId: string): ModuleInfo {
  const held = MODULES.get(moduleId);
  return { id: moduleId, label: held?.title ?? toReadable(moduleId), category: held?.category };
}

/** The collection ids one module's presets produce, in preset order. */
export function presetCollectionIds(moduleId: string): string[] {
  return (ENTITY_PRESETS[moduleId] ?? []).map((entity) => toIdentifier(entity.name));
}

export type Grouping = {
  modules: ModuleInfo[];
  byModule: Record<string, Collection[]>;
};

/**
 * Groups the collections under the modules that brought them.
 * The placement a person chose wins. A collection a preset named sits under
 * the first chosen module holding that preset. The rest sit under one group
 * for collections added by hand.
 */
export function groupCollections(
  blueprint: Blueprint,
  moduleIds: string[],
  placement: Record<string, string>,
): Grouping {
  const byModule: Record<string, Collection[]> = {};
  const presetOwner = new Map<string, string>();
  for (const moduleId of moduleIds) {
    byModule[moduleId] = [];
    for (const id of presetCollectionIds(moduleId)) {
      if (presetOwner.has(id) === false) presetOwner.set(id, moduleId);
    }
  }
  for (const collection of blueprint.collections) {
    const placed = placement[collection.id];
    const owner =
      placed && (placed === CUSTOM_MODULE.id || moduleIds.includes(placed))
        ? placed
        : (presetOwner.get(collection.id) ?? CUSTOM_MODULE.id);
    (byModule[owner] ??= []).push(collection);
  }
  const modules = moduleIds.map(moduleInfo);
  if ((byModule[CUSTOM_MODULE.id] ?? []).length > 0 || moduleIds.length === 0) {
    modules.push(CUSTOM_MODULE);
    byModule[CUSTOM_MODULE.id] ??= [];
  }
  return { modules, byModule };
}

/** Finds the module a collection sits under. */
export function moduleOf(grouping: Grouping, collectionId: string): string | null {
  for (const [moduleId, list] of Object.entries(grouping.byModule)) {
    if (list.some((entry) => entry.id === collectionId)) return moduleId;
  }
  return null;
}

/* The field grid in Blueprint terms ---------------------------------------- */

/** Reads the kind a person chose back out of a field type. */
export function kindOf(type: TypeExpression): TypeExpression['kind'] {
  return type.kind === 'Optional' ? type.inner.kind : type.kind;
}

/** Builds the type expression one choice produces, keeping an optional wrapper. */
export function buildType(
  kind: TypeExpression['kind'],
  options: { optional: boolean; collection?: string; named?: string; scale?: number },
): TypeExpression {
  let inner: TypeExpression;
  switch (kind) {
    case 'Decimal':
      inner = { kind: 'Decimal', scale: options.scale ?? 2 };
      break;
    case 'Reference':
      inner = { kind: 'Reference', collection: options.collection ?? 'record' };
      break;
    case 'Named':
      inner = { kind: 'Named', name: options.named ?? 'value' };
      break;
    case 'List':
      inner = { kind: 'List', element: { kind: 'Text' } };
      break;
    case 'Map':
      inner = { kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Text' } };
      break;
    case 'Optional':
      inner = { kind: 'Text' };
      break;
    default:
      inner = { kind } as TypeExpression;
  }
  return options.optional ? { kind: 'Optional', inner } : inner;
}

/** States one field type in the words a person reads. */
export function describeType(type: TypeExpression): string {
  if (type.kind === 'Optional') return `${describeType(type.inner)}, and may be absent`;
  if (type.kind === 'Decimal') return `Exact decimal to ${type.scale} places`;
  if (type.kind === 'Reference') return `Links to a ${toReadable(type.collection).toLowerCase()}`;
  if (type.kind === 'Named') return `One of the ${toReadable(type.name).toLowerCase()} set`;
  if (type.kind === 'List') return `Several ${describeType(type.element).toLowerCase()}`;
  if (type.kind === 'Map') return 'Lookup table';
  return FIELD_KINDS.find((entry) => entry.kind === type.kind)?.label ?? type.kind;
}

/** Reports whether a collection keeps one field unique through an index. */
export function isUnique(collection: Collection, fieldName: string): boolean {
  return collection.indexes.some(
    (index) => index.unique && index.fields.length === 1 && index.fields[0] === fieldName,
  );
}

/** Sets or clears the unique index on one field. */
export function setUnique(
  blueprint: Blueprint,
  collection: Collection,
  fieldName: string,
  unique: boolean,
): Blueprint {
  const id = `${collection.id}_by_${fieldName}`;
  const others = collection.indexes.filter(
    (index) => (index.fields.length === 1 && index.fields[0] === fieldName) === false,
  );
  return putCollection(blueprint, {
    ...collection,
    indexes: unique ? [...others, { id, fields: [fieldName], unique: true }] : others,
  });
}

/** Reads the text a person sees in the default column. */
export function defaultText(field: RecordField): string {
  const held = field.default;
  if (!held || held.kind === 'Empty') return '';
  if (held.kind === 'Boolean') return held.value ? 'true' : 'false';
  if (held.kind === 'Integer') return String(held.value);
  return held.value;
}

/** Turns the text a person typed into the literal the field type takes. */
export function literalFor(type: TypeExpression, text: string): LiteralValue | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const inner = type.kind === 'Optional' ? type.inner : type;
  switch (inner.kind) {
    case 'Integer': {
      const value = Number(trimmed);
      return Number.isInteger(value) ? { kind: 'Integer', value } : undefined;
    }
    case 'Decimal':
      return /^-?\d+(\.\d+)?$/.test(trimmed)
        ? { kind: 'Decimal', value: trimmed, scale: inner.scale }
        : undefined;
    case 'Boolean':
      if (trimmed === 'true' || trimmed === 'yes') return { kind: 'Boolean', value: true };
      if (trimmed === 'false' || trimmed === 'no') return { kind: 'Boolean', value: false };
      return undefined;
    case 'Timestamp':
      return { kind: 'Timestamp', value: trimmed };
    case 'Identity':
      return { kind: 'Identity', value: trimmed };
    case 'Hash':
      return { kind: 'Hash', value: trimmed };
    case 'Text':
    case 'Named':
      return { kind: 'Text', value: trimmed };
    default:
      return undefined;
  }
}

/** The sentence beside the default column for one type. */
export function defaultHint(type: TypeExpression): string {
  const inner = type.kind === 'Optional' ? type.inner : type;
  switch (inner.kind) {
    case 'Integer':
      return 'A whole number.';
    case 'Decimal':
      return `A number to ${inner.scale} places.`;
    case 'Boolean':
      return 'true or false.';
    case 'Timestamp':
      return 'A date and time.';
    case 'Text':
    case 'Named':
    case 'Identity':
    case 'Hash':
      return 'The value a new record starts with.';
    default:
      return 'This kind takes no starting value.';
  }
}

/** Reads the option list of a field whose kind names a set. */
export function optionsOf(blueprint: Blueprint, field: RecordField): string[] {
  const inner = field.type.kind === 'Optional' ? field.type.inner : field.type;
  if (inner.kind !== 'Named') return [];
  const held = blueprint.types.find((entry) => entry.id === inner.name);
  return held && held.kind === 'Enumeration' ? held.variants : [];
}

/**
 * Writes the option list of one field as a named enumeration type.
 * A field new to the set kind gets an enumeration named after the collection
 * and the field.
 */
export function setOptions(
  blueprint: Blueprint,
  collection: Collection,
  fieldIndex: number,
  options: string[],
): Blueprint {
  const record = recordTypeOf(blueprint, collection);
  const field = record?.fields[fieldIndex];
  if (!record || !field) return blueprint;
  const optional = field.type.kind === 'Optional';
  const inner = optional ? (field.type as { inner: TypeExpression }).inner : field.type;
  const enumerationId =
    inner.kind === 'Named' ? inner.name : `${collection.id}_${field.name}`;
  const variants = Array.from(
    new Set(options.map((entry) => toIdentifier(entry)).filter((entry) => entry.length > 0)),
  );
  const withType = putType(blueprint, {
    id: enumerationId,
    kind: 'Enumeration',
    variants: variants.length > 0 ? variants : ['value'],
    description: `The values ${toReadable(field.name).toLowerCase()} takes.`,
  });
  const type: TypeExpression = optional
    ? { kind: 'Optional', inner: { kind: 'Named', name: enumerationId } }
    : { kind: 'Named', name: enumerationId };
  return putFields(
    withType,
    record.id,
    record.fields.map((entry, position) => (position === fieldIndex ? { ...entry, type } : entry)),
  );
}

/** A new collection with its key field, placed under one module. */
export function newCollection(
  blueprint: Blueprint,
  name: string,
  retentionDays: number,
): { blueprint: Blueprint; collection: Collection | null } {
  const id = toIdentifier(name);
  if (id.length === 0 || blueprint.collections.some((entry) => entry.id === id)) {
    return { blueprint, collection: null };
  }
  const recordTypeId = `${id}_record`;
  const withType = putType(blueprint, {
    id: recordTypeId,
    kind: 'Record',
    fields: [
      {
        name: 'id',
        type: { kind: 'Text' },
        required: true,
        validation: [],
        description: `The key Cerulea gives one ${toReadable(id).toLowerCase()}.`,
      },
    ],
    description: `One ${toReadable(id).toLowerCase()} record.`,
  });
  const collection: Collection = {
    id,
    record_type: recordTypeId,
    primary_key: 'id',
    indexes: [],
    privacy: 'Open',
    retention: { period_days: retentionDays, on_expiry: 'Archive' },
    purpose: {
      statement: `We keep every ${toReadable(id).toLowerCase()} record so the system stays provable.`,
      lawful_basis: 'Contract',
    },
    description: `Every ${toReadable(id).toLowerCase()} the system keeps.`,
  };
  return { blueprint: putCollection(withType, collection), collection };
}

/**
 * Renames one collection and every reference to it.
 * References, permissions, rules, actions, workflows and views follow the new
 * name, so nothing dangles.
 */
export function renameCollection(blueprint: Blueprint, fromId: string, name: string): Blueprint {
  const toId = toIdentifier(name);
  if (toId === fromId || toId.length === 0) return blueprint;
  if (blueprint.collections.some((entry) => entry.id === toId)) return blueprint;
  const collection = blueprint.collections.find((entry) => entry.id === fromId);
  if (!collection) return blueprint;
  const fromType = collection.record_type;
  const toType = fromType === `${fromId}_record` ? `${toId}_record` : fromType;
  const swapType = (type: TypeExpression): TypeExpression => {
    switch (type.kind) {
      case 'Reference':
        return type.collection === fromId ? { kind: 'Reference', collection: toId } : type;
      case 'Optional':
        return { kind: 'Optional', inner: swapType(type.inner) };
      case 'List':
        return { kind: 'List', element: swapType(type.element) };
      case 'Map':
        return { kind: 'Map', key: swapType(type.key), value: swapType(type.value) };
      case 'Named':
        return type.name === fromType ? { kind: 'Named', name: toType } : type;
      default:
        return type;
    }
  };
  const swapId = (id: string) => (id === fromId ? toId : id);
  const swapEffects = (effects: Blueprint['actions'][number]['effects']): typeof effects =>
    effects.map((effect) => {
      if (effect.kind === 'Compensate') {
        return { ...effect, effects: swapEffects(effect.effects), on_failure: swapEffects(effect.on_failure) };
      }
      if ('collection' in effect) return { ...effect, collection: swapId(effect.collection) };
      return effect;
    });
  return {
    ...blueprint,
    types: blueprint.types.map((type) => {
      const id = type.id === fromType ? toType : type.id;
      if (type.kind === 'Record') {
        return { ...type, id, fields: type.fields.map((field) => ({ ...field, type: swapType(field.type) })) };
      }
      return { ...type, id };
    }),
    collections: blueprint.collections.map((entry) =>
      entry.id === fromId
        ? {
            ...entry,
            id: toId,
            record_type: toType,
            indexes: entry.indexes.map((index) => ({
              ...index,
              id: index.id.startsWith(`${fromId}_`) ? `${toId}_${index.id.slice(fromId.length + 1)}` : index.id,
            })),
          }
        : entry,
    ),
    permissions: blueprint.permissions.map((entry) => ({
      ...entry,
      collection: swapId(entry.collection),
      id: entry.id.endsWith(`_on_${fromId}`) ? `${entry.role}_on_${toId}` : entry.id,
    })),
    rules: blueprint.rules.map((rule) => ({ ...rule, collections: rule.collections.map(swapId) })),
    actions: blueprint.actions.map((action) => ({ ...action, effects: swapEffects(action.effects) })),
    workflows: blueprint.workflows.map((workflow) => ({ ...workflow, collection: swapId(workflow.collection) })),
    events: blueprint.events.map((event) => ({
      ...event,
      payload_type: event.payload_type === fromType ? toType : event.payload_type,
    })),
    views: blueprint.views.map((view) => ({
      ...view,
      collection: swapId(view.collection),
      joins: view.joins.map((join) => ({ ...join, collection: swapId(join.collection) })),
    })),
  };
}

/* Exposure ------------------------------------------------------------------ */

/** The role that stands for anyone, signed in or not. */
export const PUBLIC_ROLE = { id: 'public', name: 'Anyone', credentials: [] as string[] };

/** Reports whether anyone may read one collection. */
export function isPublished(blueprint: Blueprint, collectionId: string): boolean {
  return blueprint.permissions.some(
    (entry) =>
      entry.role === PUBLIC_ROLE.id &&
      entry.collection === collectionId &&
      entry.capabilities.includes('Read'),
  );
}

/**
 * Opens or closes a collection to anyone.
 * Publishing adds the Anyone role when the Blueprint lacks it and gives it
 * Read on the collection. Closing removes that entry alone.
 */
export function setPublished(blueprint: Blueprint, collectionId: string, published: boolean): Blueprint {
  const withRole =
    published && blueprint.identities.roles.some((role) => role.id === PUBLIC_ROLE.id) === false
      ? putRole(blueprint, { ...PUBLIC_ROLE })
      : blueprint;
  return setCapabilities(withRole, {
    roleId: PUBLIC_ROLE.id,
    collectionId,
    capabilities: published ? ['Read'] : [],
  });
}

/* Recommended triggers -------------------------------------------------------- */

export type RecommendedTrigger = {
  /** The event, in plain words. */
  when: string;
  /** The action, in plain words. */
  then: string;
  /** Why the trigger is worth having. */
  why: string;
};

/**
 * The triggers Cerulea recommends for one module, derived from the records it
 * keeps. Every recommendation writes typed entries: an event for the when, an
 * action for the then, reading the record and announcing the outcome.
 */
export function recommendedTriggers(collections: Collection[]): RecommendedTrigger[] {
  const held: RecommendedTrigger[] = [];
  for (const collection of collections.slice(0, 3)) {
    const name = toReadable(collection.id).toLowerCase();
    held.push({
      when: `A ${name} is added`,
      then: `Write the ${name} to the audit trail`,
      why: `Every new ${name} leaves a line a reviewer reads later.`,
    });
    held.push({
      when: `A ${name} changes`,
      then: `Tell the roles that hold the ${name}`,
      why: `A person who holds a ${name} hears of a change before it reaches them another way.`,
    });
  }
  return held;
}

/**
 * Writes one trigger as typed entries: an event for the when, an action for
 * the then. The action reads the collection and announces the outcome, so its
 * Access Manifest reads the collection and its emits name the outcome.
 */
export function writeTrigger(
  blueprint: Blueprint,
  input: { when: string; then: string; why: string; collectionId: string; roleId?: string },
): Blueprint {
  const whenId = toIdentifier(input.when);
  const thenId = toIdentifier(input.then);
  const outcomeId = `${thenId}_done`;
  const collection = blueprint.collections.find((entry) => entry.id === input.collectionId);
  const payload = collection?.record_type ?? blueprint.types[0]?.id ?? 'record';
  const roleId = input.roleId ?? blueprint.identities.roles[0]?.id ?? 'owner';
  const events = [...blueprint.events];
  if (events.some((entry) => entry.id === whenId) === false) {
    events.push({ id: whenId, name: input.when, payload_type: payload, audit: true, description: input.why });
  }
  if (events.some((entry) => entry.id === outcomeId) === false) {
    events.push({
      id: outcomeId,
      name: `${input.then} done`,
      payload_type: payload,
      audit: true,
      description: `${input.then} finished.`,
    });
  }
  const actions = blueprint.actions.filter((entry) => entry.id !== thenId);
  actions.push({
    id: thenId,
    name: input.then,
    params: [],
    preconditions: [],
    effects: [
      { kind: 'Read', collection: input.collectionId, key: { kind: 'Full' }, bind: `held_${input.collectionId}` },
      { kind: 'Emit', event: outcomeId, payload: { kind: 'Param', name: 'record' } },
    ],
    emits: [outcomeId],
    class: 'Routine',
    roles: [roleId],
    description: `When ${input.when.toLowerCase()}: ${input.why}`,
  });
  return { ...blueprint, events, actions };
}

/** Reads the when and then back out of an action a trigger wrote. */
export function triggerOfAction(
  blueprint: Blueprint,
  actionId: string,
): { when: string; then: string; why: string; collectionId: string } | null {
  const action = blueprint.actions.find((entry) => entry.id === actionId);
  if (!action) return null;
  const read = action.effects.find((effect) => effect.kind === 'Read');
  const match = /^When (.+?): (.*)$/.exec(action.description);
  if (!read || read.kind !== 'Read' || !match) return null;
  return {
    when: match[1].charAt(0).toUpperCase() + match[1].slice(1),
    then: action.name,
    why: match[2],
    collectionId: read.collection,
  };
}
