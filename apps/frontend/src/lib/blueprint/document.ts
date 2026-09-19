// apps/frontend/src/lib/blueprint/document.ts
// Reading one Blueprint document safely.
// Cerulea APIs sends the Blueprint as plain data. These readers take the
// section a screen needs and answer with an empty section when the document
// carries none, so a screen never reads through an absent value.
// Without these readers every screen would repeat the same checks.

import {
  BLUEPRINT_SCHEMA_VERSION,
  type Action,
  type Blueprint,
  type Collection,
  type EventDefinition,
  type Governance,
  type Identities,
  type Integrations,
  type PermissionEntry,
  type Rule,
  type TypeDefinition,
  type View,
  type Workflow,
} from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function whole(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The governance section every deployment carries. */
export function readGovernance(document: unknown): Governance {
  const held = record(record(document).governance);
  const quorum = record(held.quorum);
  return {
    authority: list<string>(held.authority),
    quorum: {
      routine: whole(quorum.routine, 51),
      financial: whole(quorum.financial, 67),
      structural: whole(quorum.structural, 80),
      constitutional: whole(quorum.constitutional, 90),
    },
    constitutional_delay_blocks: whole(held.constitutional_delay_blocks, 28800),
    change_process: text(held.change_process),
  };
}

/** The integrations section, with every list present. */
export function readIntegrations(document: unknown): Integrations {
  const held = record(record(document).integrations);
  return {
    feeds: list(held.feeds),
    bridges: list(held.bridges),
    triggers: list(held.triggers),
  };
}

/** The identities section, with every list present. */
export function readIdentities(document: unknown): Identities {
  const held = record(record(document).identities);
  return {
    units: list(held.units),
    roles: list(held.roles),
    credentials: list(held.credentials),
    delegations: list(held.delegations),
  };
}

export function readCollections(document: unknown): Collection[] {
  return list<Collection>(record(document).collections);
}

export function readTypes(document: unknown): TypeDefinition[] {
  return list<TypeDefinition>(record(document).types);
}

export function readPermissions(document: unknown): PermissionEntry[] {
  return list<PermissionEntry>(record(document).permissions);
}

export function readRules(document: unknown): Rule[] {
  return list<Rule>(record(document).rules);
}

export function readActions(document: unknown): Action[] {
  return list<Action>(record(document).actions);
}

export function readWorkflows(document: unknown): Workflow[] {
  return list<Workflow>(record(document).workflows);
}

export function readEvents(document: unknown): EventDefinition[] {
  return list<EventDefinition>(record(document).events);
}

export function readViews(document: unknown): View[] {
  return list<View>(record(document).views);
}

export function readName(document: unknown): string {
  return text(record(document).name);
}

export function readSummary(document: unknown): string {
  return text(record(document).summary);
}

/** Counts every item the twelve sections hold. */
export function countSections(document: unknown): Record<string, number> {
  const integrations = readIntegrations(document);
  const identities = readIdentities(document);
  return {
    types: readTypes(document).length,
    collections: readCollections(document).length,
    roles: identities.roles.length,
    permissions: readPermissions(document).length,
    rules: readRules(document).length,
    actions: readActions(document).length,
    workflows: readWorkflows(document).length,
    events: readEvents(document).length,
    views: readViews(document).length,
    feeds: integrations.feeds.length,
    bridges: integrations.bridges.length,
    triggers: integrations.triggers.length,
  };
}

/**
 * Reads a whole Blueprint, filling every absent section.
 * Screens that write the Blueprint back start from this value, so a save never
 * drops a section the document already held.
 */
export function readBlueprintDocument(document: unknown, fallbackName = 'New system'): Blueprint {
  const held = record(document);
  const economics = held.economics;
  return {
    schema_version: text(held.schema_version, BLUEPRINT_SCHEMA_VERSION),
    name: text(held.name, fallbackName),
    summary: readSummary(document),
    types: readTypes(document),
    collections: readCollections(document),
    identities: readIdentities(document),
    permissions: readPermissions(document),
    rules: readRules(document),
    actions: readActions(document),
    workflows: readWorkflows(document),
    events: readEvents(document),
    views: readViews(document),
    integrations: readIntegrations(document),
    governance: readGovernance(document),
    economics:
      economics && typeof economics === 'object'
        ? (economics as Blueprint['economics'])
        : null,
  };
}
