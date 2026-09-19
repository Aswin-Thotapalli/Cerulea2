// apps/frontend/src/lib/blueprint/guidance.ts
// Validation as guidance, with one action per correction.
//
// Every entry the Cerulea APIs compiler reports already names the fix in a
// sentence. This module turns that sentence into an action a person takes
// once. Applying a fix changes the Blueprint and nothing else, so the same
// correction made by hand produces the same document.
//
// The Studio schema check reports in the same shape, so the guidance surface
// reads one list whichever check found the problem.
//
// Without this module a person would read what to do and then hunt for the
// place to do it.

import type { CompilerEntry, CompilerReport } from '@/lib/cerulea-api';
import { toIdentifier, toReadable } from './compose';
import {
  putAction,
  putCollection,
  putRole,
  putType,
  putWorkflow,
  recordTypeOf,
} from './edit';
import { validateBlueprint, type SchemaFault } from './validate';
import { CLASS_THRESHOLDS, type Blueprint, type TransactionClass } from './types';

export type GuidanceSource = 'compiler' | 'schema';

export type GuidanceEntry = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  /** The sentence naming what to do. */
  fix: string;
  section: string;
  path: string;
  elementId?: string;
  elementName?: string;
  /** The screen that produces this line. */
  screen: string;
  source: GuidanceSource;
};

export type GuidedFix = {
  /** The words on the action. */
  label: string;
  /** One sentence stating what applying the action changes. */
  plain: string;
  apply: (blueprint: Blueprint) => Blueprint;
};

/** The screen each Blueprint section is edited on. */
export const SECTION_SCREEN: Record<string, string> = {
  types: 'Model, records',
  collections: 'Model, records',
  identities: 'Model, permissions',
  permissions: 'Model, permissions',
  rules: 'Model, rules and actions',
  actions: 'Model, rules and actions',
  workflows: 'Model, workflows',
  events: 'Model, rules and actions',
  views: 'Blueprint, views',
  integrations: 'Compose',
  governance: 'Policies',
  economics: 'Foundation',
  document: 'Blueprint',
};

/** Reads the compiler report as guidance entries. */
export function entriesFromReport(report: CompilerReport | null): GuidanceEntry[] {
  if (report === null) return [];
  const held: GuidanceEntry[] = [];
  for (const section of report.sections) {
    for (const entry of section.entries) {
      held.push({ ...entry, source: 'compiler' });
    }
  }
  return held;
}

/** Reads the Studio schema check as guidance entries. */
export function entriesFromSchema(blueprint: Blueprint): GuidanceEntry[] {
  return validateBlueprint(blueprint).map((fault: SchemaFault) => ({
    code: fault.code,
    severity: 'error' as const,
    message: fault.message,
    fix: fault.fix,
    section: String(fault.section),
    path: fault.path,
    screen: SECTION_SCREEN[String(fault.section)] ?? 'Blueprint',
    source: 'schema' as const,
  }));
}

/**
 * Both checks in one list, with one correction per place.
 * The compiler and the Studio schema check reach the same place from two
 * directions. One place carries one correction, and the compiler entry wins
 * because it names the stage the Blueprint stopped at.
 */
export function guidanceFor(
  blueprint: Blueprint,
  report: CompilerReport | null,
): GuidanceEntry[] {
  const held = [...entriesFromReport(report), ...entriesFromSchema(blueprint)];
  const seen = new Set<string>();
  return held.filter((entry) => {
    const key = `${entry.section}:${entry.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/* Reading a name out of a message -------------------------------------- */

function named(message: string, pattern: RegExp): string | undefined {
  const held = pattern.exec(message);
  return held?.[1];
}

const ROLE_NAME = /names the role ([a-z0-9_]+)/;
const COLLECTION_NAME = /(?:names|reads) the collection ([a-z0-9_]+)/;
const RECORD_TYPE_NAME = /names the record type ([a-z0-9_]+)/;
const STATE_NAME = /(?:opens in|moves to) the state ([a-z0-9_]+)/;
const FIELD_NAME = /names the primary key ([a-z0-9_]+)/;
const PATH_INDEX = /\[(\d+)\]/;

function indexIn(path: string): number | undefined {
  const held = PATH_INDEX.exec(path);
  return held === undefined || held === null ? undefined : Number(held[1]);
}

/* The fixes ------------------------------------------------------------- */

function addRole(blueprint: Blueprint, roleId: string): Blueprint {
  return putRole(blueprint, {
    id: roleId,
    name: toReadable(roleId),
    credentials: [],
  });
}

function addCollection(blueprint: Blueprint, collectionId: string): Blueprint {
  const recordTypeId = `${collectionId}_record`;
  const withType = putType(blueprint, {
    id: recordTypeId,
    kind: 'Record',
    fields: [
      {
        name: 'id',
        type: { kind: 'Text' },
        required: true,
        validation: [],
        description: `The value naming one ${toReadable(collectionId).toLowerCase()} record.`,
      },
    ],
    description: `One ${toReadable(collectionId).toLowerCase()} record.`,
  });
  return putCollection(withType, {
    id: collectionId,
    record_type: recordTypeId,
    primary_key: 'id',
    indexes: [],
    privacy: 'Open',
    retention: { period_days: 3650, on_expiry: 'Archive' },
    purpose: {
      statement: `We keep every ${toReadable(collectionId).toLowerCase()} record so the system stays provable.`,
      lawful_basis: 'Contract',
    },
    description: `Every ${toReadable(collectionId).toLowerCase()} the system keeps.`,
  });
}

function addRecordType(blueprint: Blueprint, recordTypeId: string, keyField: string): Blueprint {
  return putType(blueprint, {
    id: recordTypeId,
    kind: 'Record',
    fields: [
      {
        name: keyField,
        type: { kind: 'Text' },
        required: true,
        validation: [],
        description: `The value naming one ${toReadable(recordTypeId).toLowerCase()}.`,
      },
    ],
    description: `One ${toReadable(recordTypeId).toLowerCase()}.`,
  });
}

/**
 * The action that carries out one correction.
 * A correction Cerulea cannot carry out on its own answers with nothing, and
 * the surface then shows the sentence alone.
 */
export function fixFor(entry: GuidanceEntry, blueprint: Blueprint): GuidedFix | undefined {
  switch (entry.code) {
    /* A dangling reference to a role ---------------------------------- */
    case 'validate.role_absent':
    case 'schema.role_absent':
    case 'schema.action_role_absent': {
      const roleId = named(entry.message, ROLE_NAME);
      if (roleId === undefined) return undefined;
      return {
        label: `Add the role ${toReadable(roleId)}`,
        plain: `Cerulea adds a role named ${toReadable(roleId)} with no credential attached. The entry then points at a role the Blueprint holds.`,
        apply: (held) => addRole(held, roleId),
      };
    }

    /* A dangling reference to a collection ---------------------------- */
    case 'validate.collection_absent':
    case 'schema.collection_absent':
    case 'schema.workflow_collection_absent':
    case 'schema.view_collection_absent': {
      const collectionId = named(entry.message, COLLECTION_NAME);
      if (collectionId === undefined) return undefined;
      return {
        label: `Add the collection ${toReadable(collectionId)}`,
        plain: `Cerulea adds a collection named ${toReadable(collectionId)} with one key field, a retention period and a stated purpose. The reference then reaches a collection the Blueprint holds.`,
        apply: (held) => addCollection(held, collectionId),
      };
    }

    /* A dangling reference to a record type --------------------------- */
    case 'validate.record_type_absent':
    case 'schema.record_type_absent': {
      const recordTypeId = named(entry.message, RECORD_TYPE_NAME);
      if (recordTypeId === undefined) return undefined;
      const position = indexIn(entry.path);
      return {
        label: `Add the record type ${toReadable(recordTypeId)}`,
        plain: `Cerulea declares the record type ${toReadable(recordTypeId)} with the key field the collection names.`,
        apply: (held) => {
          const collection =
            position === undefined ? held.collections[0] : held.collections[position];
          return addRecordType(held, recordTypeId, collection?.primary_key ?? 'id');
        },
      };
    }

    /* A collection naming a key field the record leaves out ------------ */
    case 'validate.primary_key_absent': {
      const keyField = named(entry.message, FIELD_NAME);
      const position = indexIn(entry.path);
      if (keyField === undefined || position === undefined) return undefined;
      return {
        label: `Add the field ${toReadable(keyField)}`,
        plain: `Cerulea adds the field ${toReadable(keyField)} to the record this collection keeps, so the key reaches a field that exists.`,
        apply: (held) => {
          const collection = held.collections[position];
          const record = collection ? recordTypeOf(held, collection) : null;
          if (!record) return held;
          return putType(held, {
            ...record,
            fields: [
              ...record.fields,
              {
                name: keyField,
                type: { kind: 'Text' },
                required: true,
                validation: [],
                description: `The value naming one ${toReadable(collection.id).toLowerCase()} record.`,
              },
            ],
          });
        },
      };
    }

    /* A collection stating no purpose ---------------------------------- */
    case 'schema.purpose_absent': {
      const position = indexIn(entry.path);
      if (position === undefined) return undefined;
      return {
        label: 'State the purpose',
        plain:
          'Cerulea states why the deployment holds this data and names the contract as the lawful basis. A read outside that purpose is then refused and recorded.',
        apply: (held) => {
          const collection = held.collections[position];
          if (!collection) return held;
          return putCollection(held, {
            ...collection,
            purpose: {
              statement: `We keep every ${toReadable(collection.id).toLowerCase()} record so the system stays provable.`,
              lawful_basis: 'Contract',
            },
          });
        },
      };
    }

    /* A collection declaring no retention ------------------------------ */
    case 'schema.retention_absent':
    case 'schema.retention_period': {
      const position = indexIn(entry.path);
      if (position === undefined) return undefined;
      return {
        label: 'Set the retention period',
        plain:
          'Cerulea keeps the records for ten years and archives them once the period ends. Change the period on the records screen at any time.',
        apply: (held) => {
          const collection = held.collections[position];
          if (!collection) return held;
          return putCollection(held, {
            ...collection,
            retention: { period_days: 3650, on_expiry: 'Archive' },
          });
        },
      };
    }

    /* An action naming no transaction class ---------------------------- */
    case 'schema.action_class_absent':
    case 'classes.declared_below_effects': {
      const position = indexIn(entry.path);
      const raised = entry.code === 'classes.declared_below_effects';
      return {
        label: raised ? 'Raise the class' : 'Name the class',
        plain: raised
          ? 'Cerulea raises this action to the class its effects call for, so the right share of validators must agree before it commits.'
          : 'Cerulea names this action routine, the everyday class. Raise it on the rules and actions screen where the action moves value or changes the shape of the system.',
        apply: (held) => {
          const action =
            position === undefined
              ? held.actions.find((entry_) => entry_.id === entry.elementId)
              : held.actions[position];
          if (!action) return held;
          const next: TransactionClass = raised ? classAbove(action.class) : 'Routine';
          return putAction(held, { ...action, class: next });
        },
      };
    }

    /* A workflow naming a state it lacks ------------------------------- */
    case 'validate.workflow_state_absent':
    case 'schema.workflow_initial_state_absent':
    case 'schema.workflow_state_absent': {
      const stateId = named(entry.message, STATE_NAME);
      const position = indexIn(entry.path);
      if (stateId === undefined) return undefined;
      return {
        label: `Add the state ${toReadable(stateId)}`,
        plain: `Cerulea adds the state ${toReadable(stateId)} to this workflow, so the move reaches a state the workflow holds.`,
        apply: (held) => {
          const workflow =
            position === undefined
              ? held.workflows.find((entry_) => entry_.id === entry.elementId)
              : held.workflows[position];
          if (!workflow) return held;
          if (workflow.states.some((state) => state.id === stateId)) return held;
          return putWorkflow(held, {
            ...workflow,
            states: [
              ...workflow.states,
              { id: stateId, name: toReadable(stateId), terminal: false },
            ],
          });
        },
      };
    }

    /* A threshold below the class it serves ---------------------------- */
    case 'validate.quorum_below_class':
    case 'schema.quorum_share': {
      const name = entry.path.split('.').pop() ?? 'routine';
      return {
        label: 'Raise the threshold',
        plain:
          'Cerulea raises this threshold to the share the transaction class calls for. A lower share would commit the work on too little agreement.',
        apply: (held) => {
          const classOf: Record<string, TransactionClass> = {
            routine: 'Routine',
            financial: 'Financial',
            structural: 'Structural',
            constitutional: 'Constitutional',
          };
          const wanted = CLASS_THRESHOLDS[classOf[name] ?? 'Routine'];
          return {
            ...held,
            governance: {
              ...held.governance,
              quorum: { ...held.governance.quorum, [name]: wanted },
            },
          };
        },
      };
    }

    /* A constitutional change with no delay ---------------------------- */
    case 'validate.constitutional_delay_absent': {
      return {
        label: 'Set the delay',
        plain:
          'Cerulea makes a constitutional change wait one hundred blocks before it takes effect, so every member reads the change first.',
        apply: (held) => ({
          ...held,
          governance: { ...held.governance, constitutional_delay_blocks: 100 },
        }),
      };
    }

    /* A rule with no statement a person reads --------------------------- */
    case 'schema.rule_statement_absent': {
      const position = indexIn(entry.path);
      if (position === undefined) return undefined;
      return {
        label: 'Write the sentence',
        plain:
          'Cerulea writes the sentence a person reads when this rule declines a change. Replace it with your own wording on the rules screen.',
        apply: (held) => {
          const rule = held.rules[position];
          if (!rule) return held;
          return {
            ...held,
            rules: held.rules.map((entry_, at) =>
              at === position
                ? {
                    ...entry_,
                    statement: `${toReadable(entry_.id)} holds before the change is accepted.`,
                  }
                : entry_,
            ),
          };
        },
      };
    }

    /* The Blueprint publishes no screen --------------------------------- */
    case 'manifest.no_interface': {
      return {
        label: 'Add a screen',
        plain:
          'Cerulea publishes a list screen over the first collection, so a person reaches the records through a screen.',
        apply: (held) => {
          const collection = held.collections[0];
          if (!collection) return held;
          const record = recordTypeOf(held, collection);
          const id = toIdentifier(`${collection.id}_list`);
          if (held.views.some((view) => view.id === id)) return held;
          return {
            ...held,
            views: [
              ...held.views,
              {
                id,
                name: `Every ${toReadable(collection.id).toLowerCase()}`,
                collection: collection.id,
                projection: (record?.fields ?? []).map((field) => field.name),
                sort: [],
                aggregates: [],
                joins: [],
                roles: held.identities.roles.map((role) => role.id),
              },
            ],
          };
        },
      };
    }

    default:
      return undefined;
  }
}

/** The class one step above the class held, for an action raised by its effects. */
export function classAbove(held: TransactionClass | undefined): TransactionClass {
  switch (held) {
    case undefined:
    case 'Routine':
      return 'Financial';
    case 'Financial':
      return 'Structural';
    default:
      return 'Constitutional';
  }
}

/** Reports whether Cerulea carries out this correction on its own. */
export function hasFix(entry: GuidanceEntry, blueprint: Blueprint): boolean {
  return fixFor(entry, blueprint) !== undefined;
}

/** One sentence stating what remains, for the heading of the guidance surface. */
export function guidanceHeadline(entries: GuidanceEntry[], blueprint: Blueprint): string {
  if (entries.length === 0) return 'Nothing blocks deployment. Every check passes.';
  const withFix = entries.filter((entry) => hasFix(entry, blueprint)).length;
  const errors = entries.filter((entry) => entry.severity === 'error').length;
  return (
    `${entries.length} corrections remain, ${errors} of them blocking. ` +
    `Cerulea carries out ${withFix} of them in one action.`
  );
}

/** A single compiler entry read as guidance, for a line rendered on its own. */
export function asGuidance(entry: CompilerEntry): GuidanceEntry {
  return { ...entry, source: 'compiler' };
}
