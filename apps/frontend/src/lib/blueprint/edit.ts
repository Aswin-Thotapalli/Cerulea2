// apps/frontend/src/lib/blueprint/edit.ts
// Changing one Blueprint.
// Every edit is a pure function returning a new Blueprint, so a screen renders
// the answer and saves the same value. Every edit keeps the other eleven
// sections exactly as they stood.
// Without these functions each screen would reach into the document by hand.

import type {
  Action,
  Blueprint,
  Collection,
  PermissionCapability,
  PermissionEntry,
  PrivacyClass,
  RecordField,
  RecordTypeDefinition,
  Role,
  Rule,
  TypeDefinition,
  TypeExpression,
  Workflow,
  WorkflowState,
  WorkflowTimer,
  WorkflowTransition,
} from './types';

/** The primitive a person picks from, with the plain sentence beside each one. */
export type FieldKindChoice = {
  kind: TypeExpression['kind'];
  label: string;
  meaning: string;
};

export const FIELD_KINDS: FieldKindChoice[] = [
  { kind: 'Text', label: 'Text', meaning: 'Letters, digits and punctuation of any length.' },
  { kind: 'Integer', label: 'Whole number', meaning: 'A number with no fractional part.' },
  {
    kind: 'Decimal',
    label: 'Exact decimal',
    meaning:
      'A number kept to a fixed number of decimal places. Every node computes the same answer, so money is exact.',
  },
  { kind: 'Boolean', label: 'True or false', meaning: 'One of two values.' },
  {
    kind: 'Timestamp',
    label: 'Instant',
    meaning: 'A point in time Cerulea records against the field.',
  },
  {
    kind: 'Identity',
    label: 'Identity',
    meaning: 'The person or the organisation a record belongs to.',
  },
  {
    kind: 'Hash',
    label: 'Fingerprint',
    meaning: 'A fixed-length fingerprint of a larger value, held without the value itself.',
  },
  { kind: 'Bytes', label: 'Raw bytes', meaning: 'A run of bytes Cerulea keeps unchanged.' },
  {
    kind: 'Reference',
    label: 'Link to another record',
    meaning: 'Names one record in another collection. Cerulea checks that the record exists.',
  },
  {
    kind: 'Named',
    label: 'One of a named set',
    meaning: 'One value from a set declared once and reused across the model.',
  },
  { kind: 'List', label: 'Several of one kind', meaning: 'Any number of values of one kind.' },
  {
    kind: 'Map',
    label: 'Lookup table',
    meaning: 'Pairs where one value finds another, such as a language to a translation.',
  },
  {
    kind: 'Optional',
    label: 'May be absent',
    meaning: 'The value may be missing, and Cerulea asks before reading it.',
  },
];

/** Floating point never appears, since agreement across nodes needs exact arithmetic. */
export const FLOATING_POINT_NOTE =
  'Cerulea holds no floating point type. An exact decimal with a fixed scale keeps every node in agreement.';

export const PRIVACY_MEANING: Record<PrivacyClass, string> = {
  Open: 'Anyone permitted to read the collection reads the value.',
  HashOnly: 'The chain keeps a fingerprint. The value itself stays outside.',
  Encrypted: 'The chain keeps the value sealed. A reader needs the key as well as the permission.',
  External: 'The chain keeps a reference. The value lives in a system Cerulea names.',
};

/** Replaces one collection, keeping every other section unchanged. */
export function putCollection(blueprint: Blueprint, collection: Collection): Blueprint {
  const held = blueprint.collections.some((entry) => entry.id === collection.id);
  return {
    ...blueprint,
    collections: held
      ? blueprint.collections.map((entry) => (entry.id === collection.id ? collection : entry))
      : [...blueprint.collections, collection],
  };
}

/** Removes one collection and the record type only it used. */
export function removeCollection(blueprint: Blueprint, collectionId: string): Blueprint {
  const target = blueprint.collections.find((entry) => entry.id === collectionId);
  const collections = blueprint.collections.filter((entry) => entry.id !== collectionId);
  const stillUsed = new Set(collections.map((entry) => entry.record_type));
  const types =
    target === undefined
      ? blueprint.types
      : blueprint.types.filter(
          (entry) => entry.id !== target.record_type || stillUsed.has(entry.id),
        );
  return {
    ...blueprint,
    collections,
    types,
    permissions: blueprint.permissions.filter((entry) => entry.collection !== collectionId),
    workflows: blueprint.workflows.filter((entry) => entry.collection !== collectionId),
  };
}

/** Replaces one type definition. */
export function putType(blueprint: Blueprint, definition: TypeDefinition): Blueprint {
  const held = blueprint.types.some((entry) => entry.id === definition.id);
  return {
    ...blueprint,
    types: held
      ? blueprint.types.map((entry) => (entry.id === definition.id ? definition : entry))
      : [...blueprint.types, definition],
  };
}

/** Reads the record type behind one collection. */
export function recordTypeOf(
  blueprint: Blueprint,
  collection: Collection,
): RecordTypeDefinition | null {
  const held = blueprint.types.find(
    (entry) => entry.id === collection.record_type && entry.kind === 'Record',
  );
  return (held as RecordTypeDefinition | undefined) ?? null;
}

/** Replaces the fields of one record type. */
export function putFields(
  blueprint: Blueprint,
  recordTypeId: string,
  fields: RecordField[],
): Blueprint {
  return {
    ...blueprint,
    types: blueprint.types.map((entry) =>
      entry.id === recordTypeId && entry.kind === 'Record' ? { ...entry, fields } : entry,
    ),
  };
}

/* Identities and permissions ---------------------------------------- */

/** Replaces one role. */
export function putRole(blueprint: Blueprint, role: Role): Blueprint {
  const held = blueprint.identities.roles.some((entry) => entry.id === role.id);
  return {
    ...blueprint,
    identities: {
      ...blueprint.identities,
      roles: held
        ? blueprint.identities.roles.map((entry) => (entry.id === role.id ? role : entry))
        : [...blueprint.identities.roles, role],
    },
  };
}

/** Removes one role and every permission entry naming it. */
export function removeRole(blueprint: Blueprint, roleId: string): Blueprint {
  return {
    ...blueprint,
    identities: {
      ...blueprint.identities,
      roles: blueprint.identities.roles.filter((entry) => entry.id !== roleId),
    },
    permissions: blueprint.permissions.filter((entry) => entry.role !== roleId),
    governance: {
      ...blueprint.governance,
      authority: blueprint.governance.authority.filter((entry) => entry !== roleId),
    },
  };
}

/** Names one permission entry from the role and the collection it covers. */
export function permissionId(roleId: string, collectionId: string): string {
  return `${roleId}_on_${collectionId}`;
}

/** Reads the entry covering one role and one collection. */
export function permissionFor(
  blueprint: Blueprint,
  roleId: string,
  collectionId: string,
): PermissionEntry | null {
  return (
    blueprint.permissions.find(
      (entry) => entry.role === roleId && entry.collection === collectionId,
    ) ?? null
  );
}

/**
 * Sets the capabilities one role holds over one collection.
 * An empty capability list removes the entry, since a role with no capability
 * over a collection reaches nothing there.
 */
export function setCapabilities(
  blueprint: Blueprint,
  input: {
    roleId: string;
    collectionId: string;
    capabilities: PermissionCapability[];
    fields?: string[];
    rowFilter?: PermissionEntry['row_filter'];
  },
): Blueprint {
  const others = blueprint.permissions.filter(
    (entry) => (entry.role === input.roleId && entry.collection === input.collectionId) === false,
  );
  if (input.capabilities.length === 0) {
    return { ...blueprint, permissions: others };
  }
  const held = permissionFor(blueprint, input.roleId, input.collectionId);
  const entry: PermissionEntry = {
    id: held?.id ?? permissionId(input.roleId, input.collectionId),
    role: input.roleId,
    collection: input.collectionId,
    capabilities: input.capabilities,
    fields: input.fields ?? held?.fields ?? [],
    row_filter: input.rowFilter ?? held?.row_filter,
  };
  return { ...blueprint, permissions: [...others, entry] };
}

/* Rules and actions -------------------------------------------------- */

export function putRule(blueprint: Blueprint, rule: Rule): Blueprint {
  const held = blueprint.rules.some((entry) => entry.id === rule.id);
  return {
    ...blueprint,
    rules: held
      ? blueprint.rules.map((entry) => (entry.id === rule.id ? rule : entry))
      : [...blueprint.rules, rule],
  };
}

export function removeRule(blueprint: Blueprint, ruleId: string): Blueprint {
  return {
    ...blueprint,
    rules: blueprint.rules.filter((entry) => entry.id !== ruleId),
    actions: blueprint.actions.map((entry) => ({
      ...entry,
      preconditions: entry.preconditions.filter((name) => name !== ruleId),
    })),
  };
}

export function putAction(blueprint: Blueprint, action: Action): Blueprint {
  const held = blueprint.actions.some((entry) => entry.id === action.id);
  return {
    ...blueprint,
    actions: held
      ? blueprint.actions.map((entry) => (entry.id === action.id ? action : entry))
      : [...blueprint.actions, action],
  };
}

export function removeAction(blueprint: Blueprint, actionId: string): Blueprint {
  return {
    ...blueprint,
    actions: blueprint.actions.filter((entry) => entry.id !== actionId),
    workflows: blueprint.workflows.map((workflow) => ({
      ...workflow,
      transitions: workflow.transitions.map((transition) =>
        transition.action === actionId ? { ...transition, action: undefined } : transition,
      ),
      timers: workflow.timers.filter((timer) => timer.action !== actionId),
    })),
  };
}

/* Workflows ---------------------------------------------------------- */

export function putWorkflow(blueprint: Blueprint, workflow: Workflow): Blueprint {
  const held = blueprint.workflows.some((entry) => entry.id === workflow.id);
  return {
    ...blueprint,
    workflows: held
      ? blueprint.workflows.map((entry) => (entry.id === workflow.id ? workflow : entry))
      : [...blueprint.workflows, workflow],
  };
}

export function removeWorkflow(blueprint: Blueprint, workflowId: string): Blueprint {
  return { ...blueprint, workflows: blueprint.workflows.filter((entry) => entry.id !== workflowId) };
}

/** Adds one state and keeps the initial state pointing at a state that exists. */
export function addWorkflowState(workflow: Workflow, state: WorkflowState): Workflow {
  const states = workflow.states.some((entry) => entry.id === state.id)
    ? workflow.states.map((entry) => (entry.id === state.id ? state : entry))
    : [...workflow.states, state];
  return {
    ...workflow,
    states,
    initial_state: states.some((entry) => entry.id === workflow.initial_state)
      ? workflow.initial_state
      : (states[0]?.id ?? state.id),
  };
}

/** Removes one state with every transition and timer that named it. */
export function removeWorkflowState(workflow: Workflow, stateId: string): Workflow {
  const states = workflow.states.filter((entry) => entry.id !== stateId);
  return {
    ...workflow,
    states,
    initial_state: states.some((entry) => entry.id === workflow.initial_state)
      ? workflow.initial_state
      : (states[0]?.id ?? ''),
    transitions: workflow.transitions.filter(
      (entry) => entry.from_state !== stateId && entry.to_state !== stateId,
    ),
    timers: workflow.timers.filter((entry) => entry.state !== stateId),
  };
}

export function putTransition(workflow: Workflow, transition: WorkflowTransition): Workflow {
  const held = workflow.transitions.some((entry) => entry.id === transition.id);
  return {
    ...workflow,
    transitions: held
      ? workflow.transitions.map((entry) => (entry.id === transition.id ? transition : entry))
      : [...workflow.transitions, transition],
  };
}

export function putTimer(workflow: Workflow, timer: WorkflowTimer): Workflow {
  const held = workflow.timers.some((entry) => entry.id === timer.id);
  return {
    ...workflow,
    timers: held
      ? workflow.timers.map((entry) => (entry.id === timer.id ? timer : entry))
      : [...workflow.timers, timer],
  };
}

/** Finds a state no transition reaches, which stops a record part way through. */
export function unreachableStates(workflow: Workflow): string[] {
  const reached = new Set([workflow.initial_state]);
  let moved = true;
  while (moved) {
    moved = false;
    for (const transition of workflow.transitions) {
      if (reached.has(transition.from_state) && reached.has(transition.to_state) === false) {
        reached.add(transition.to_state);
        moved = true;
      }
    }
  }
  return workflow.states.filter((state) => reached.has(state.id) === false).map((state) => state.id);
}

/** Finds a state with no way out and no terminal mark, which strands a record. */
export function deadEndStates(workflow: Workflow): string[] {
  return workflow.states
    .filter(
      (state) =>
        state.terminal === false &&
        workflow.transitions.some((transition) => transition.from_state === state.id) === false &&
        workflow.timers.some((timer) => timer.state === state.id) === false,
    )
    .map((state) => state.id);
}
