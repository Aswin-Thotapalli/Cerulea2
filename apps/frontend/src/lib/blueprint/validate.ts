// apps/frontend/src/lib/blueprint/validate.ts
// Checking a Blueprint document against the Cerulea Blueprint schema.
//
// The schema at content/schema/blueprint.schema.json is the authority for the
// Blueprint vocabulary. Studio ships a copy of that file and reads the
// vocabularies straight out of it, so a word the schema retires stops passing
// here on the next copy.
//
// The schema describes a Blueprint fragment as the chain crate holds it. The
// document Studio writes is the assembled form Cerulea APIs holds. The two
// carry the same vocabulary under a few different names, listed in
// SCHEMA_NAMES below. Everything else is checked directly.
//
// Without this module a person editing the typed document at level four would
// learn about a broken value only when the compiler refused the whole
// Blueprint.

import schema from '@/data/blueprint.schema.json';
import {
  BLUEPRINT_SECTIONS,
  type Blueprint,
  type BlueprintSection,
  type TypeExpression,
} from './types';

type SchemaShape = {
  $defs: Record<string, Record<string, unknown>>;
};

const held = schema as unknown as SchemaShape;

function definitionOf(name: string): Record<string, unknown> {
  return held.$defs[name] ?? {};
}

function enumOf(name: string): string[] {
  const value = definitionOf(name).enum;
  return Array.isArray(value) ? (value as string[]) : [];
}

/** The pattern every Blueprint name matches, read from the schema. */
export const IDENTIFIER_PATTERN = new RegExp(
  String(definitionOf('Identifier').pattern ?? '^[a-z][a-z0-9_]*$'),
);

/** The longest Blueprint name the schema admits. */
export const IDENTIFIER_LIMIT = Number(definitionOf('Identifier').maxLength ?? 64);

/** The four transaction classes, read from the schema. */
export const TRANSACTION_CLASS_NAMES = enumOf('TransactionClass');

/** The two sort directions, read from the schema. */
export const SORT_DIRECTION_NAMES = enumOf('SortDirection');

/** The aggregate functions, read from the schema. */
export const AGGREGATE_NAMES = enumOf('AggregateFunction');

/** The bridge directions, read from the schema. */
export const BRIDGE_DIRECTION_NAMES = enumOf('BridgeDirection');

/** The greatest number of decimal places, read from the schema. */
export const DECIMAL_SCALE_LIMIT = readDecimalLimit();

function readDecimalLimit(): number {
  const typeExpr = definitionOf('TypeExpr');
  const alternatives = Array.isArray(typeExpr.oneOf) ? typeExpr.oneOf : [];
  for (const alternative of alternatives as Record<string, unknown>[]) {
    const properties = alternative.properties as Record<string, unknown> | undefined;
    const decimal = properties?.Decimal as Record<string, unknown> | undefined;
    const inner = decimal?.properties as Record<string, unknown> | undefined;
    const scale = inner?.scale as Record<string, unknown> | undefined;
    if (scale && typeof scale.maximum === 'number') return scale.maximum;
  }
  return 30;
}

/**
 * The few names the assembled document spells differently from the schema.
 * Each pair is the assembled name against the schema name.
 */
export const SCHEMA_NAMES = {
  capability: { Read: 'Read', Create: 'Insert', Update: 'Update', Delete: 'Delete' },
  bridgeDirection: { Inbound: 'Inbound', Outbound: 'Outbound', Both: 'BothWays' },
  privacy: { Open: 'Open', HashOnly: 'HashOnly', Encrypted: 'Encrypted', External: 'External' },
} as const;

/** The primitive type names the schema admits with no payload. */
export const PRIMITIVE_TYPE_NAMES = [
  'Text',
  'Integer',
  'Boolean',
  'Bytes',
  'Timestamp',
  'Identity',
  'Hash',
];

/** The lawful bases a purpose declaration names. */
export const LAWFUL_BASIS_NAMES = [
  'Consent',
  'Contract',
  'LegalObligation',
  'VitalInterest',
  'PublicTask',
  'LegitimateInterest',
];

/** The actions Cerulea takes when a retention period ends. */
export const EXPIRY_NAMES = ['Delete', 'Anonymise', 'Archive'];

export type SchemaFault = {
  /** Where the fault sits inside the document. */
  path: string;
  /** The Blueprint section the fault belongs to. */
  section: BlueprintSection | 'document';
  message: string;
  fix: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && Array.isArray(value) === false;
}

function checkName(
  faults: SchemaFault[],
  section: BlueprintSection | 'document',
  path: string,
  value: unknown,
): void {
  if (typeof value !== 'string' || value.length === 0) {
    faults.push({
      path,
      section,
      message: 'This name is absent.',
      fix: 'Give it a name of lower case letters, digits and underscores, starting with a letter.',
    });
    return;
  }
  if (IDENTIFIER_PATTERN.test(value) === false) {
    faults.push({
      path,
      section,
      message: `The name ${value} carries a character the Blueprint refuses.`,
      fix: 'Write the name in lower case letters, digits and underscores, starting with a letter.',
    });
  }
  if (value.length > IDENTIFIER_LIMIT) {
    faults.push({
      path,
      section,
      message: `The name ${value} runs past ${IDENTIFIER_LIMIT} characters.`,
      fix: `Shorten the name to ${IDENTIFIER_LIMIT} characters or fewer.`,
    });
  }
}

function checkTypeExpression(
  faults: SchemaFault[],
  section: BlueprintSection,
  path: string,
  type: unknown,
): void {
  if (isRecord(type) === false || typeof type.kind !== 'string') {
    faults.push({
      path,
      section,
      message: 'This type is absent.',
      fix: `Name a type, for example ${PRIMITIVE_TYPE_NAMES.join(', ')}.`,
    });
    return;
  }
  const kind = type.kind as TypeExpression['kind'];
  if (PRIMITIVE_TYPE_NAMES.includes(kind)) return;
  switch (kind) {
    case 'Decimal': {
      const scale = type.scale;
      if (typeof scale !== 'number' || scale < 0 || scale > DECIMAL_SCALE_LIMIT) {
        faults.push({
          path: `${path}.scale`,
          section,
          message: `A decimal carries between 0 and ${DECIMAL_SCALE_LIMIT} places.`,
          fix: `Set the places to a whole number between 0 and ${DECIMAL_SCALE_LIMIT}.`,
        });
      }
      return;
    }
    case 'List':
      checkTypeExpression(faults, section, `${path}.element`, type.element);
      return;
    case 'Map':
      checkTypeExpression(faults, section, `${path}.key`, type.key);
      checkTypeExpression(faults, section, `${path}.value`, type.value);
      return;
    case 'Optional':
      checkTypeExpression(faults, section, `${path}.inner`, type.inner);
      return;
    case 'Reference':
      checkName(faults, section, `${path}.collection`, type.collection);
      return;
    case 'Named':
      checkName(faults, section, `${path}.name`, type.name);
      return;
    default:
      faults.push({
        path,
        section,
        message: `The Blueprint holds no type named ${String(type.kind)}.`,
        fix: `Use one of ${PRIMITIVE_TYPE_NAMES.join(', ')}, Decimal, List, Map, Optional, Reference or Named.`,
      });
  }
}

function checkMember(
  faults: SchemaFault[],
  section: BlueprintSection,
  path: string,
  value: unknown,
  admitted: readonly string[],
): void {
  if (typeof value !== 'string' || admitted.includes(value) === false) {
    faults.push({
      path,
      section,
      message: `The Blueprint refuses the value ${String(value)} here.`,
      fix: `Use one of ${admitted.join(', ')}.`,
    });
  }
}

/**
 * Checks one Blueprint document.
 * Every fault names its place, states the problem and names the fix.
 */
export function validateBlueprint(document: unknown): SchemaFault[] {
  const faults: SchemaFault[] = [];
  if (isRecord(document) === false) {
    return [
      {
        path: '',
        section: 'document',
        message: 'This Blueprint is not an object.',
        fix: 'Write the Blueprint as an object holding the twelve sections.',
      },
    ];
  }

  if (typeof document.schema_version !== 'string') {
    faults.push({
      path: 'schema_version',
      section: 'document',
      message: 'The Blueprint names no schema version.',
      fix: 'Set schema_version to three numbers joined by full stops, for example 1.0.0.',
    });
  }
  if (typeof document.name !== 'string' || document.name.trim().length === 0) {
    faults.push({
      path: 'name',
      section: 'document',
      message: 'The Blueprint carries no name.',
      fix: 'Set name to the name this system carries.',
    });
  }

  for (const section of BLUEPRINT_SECTIONS) {
    const value = document[section];
    if (section === 'identities') {
      if (isRecord(value) === false) {
        faults.push({
          path: section,
          section,
          message: 'The identities section is absent.',
          fix: 'Write identities as an object holding units, roles, credentials and delegations.',
        });
      }
      continue;
    }
    if (section === 'integrations') {
      if (isRecord(value) === false) {
        faults.push({
          path: section,
          section,
          message: 'The integrations section is absent.',
          fix: 'Write integrations as an object holding feeds, bridges and triggers.',
        });
      }
      continue;
    }
    if (section === 'governance') {
      if (isRecord(value) === false) {
        faults.push({
          path: section,
          section,
          message: 'The governance section is absent.',
          fix: 'Write governance as an object holding the authority, the quorum and the change process.',
        });
      }
      continue;
    }
    if (section === 'economics') {
      if (value !== null && isRecord(value) === false) {
        faults.push({
          path: section,
          section,
          message: 'The economics section holds a value the Blueprint refuses.',
          fix: 'Write economics as an object holding a unit of account, or write null where the system holds no unit of account.',
        });
      }
      continue;
    }
    if (Array.isArray(value) === false) {
      faults.push({
        path: section,
        section,
        message: `The ${section} section is absent.`,
        fix: `Write ${section} as a list, empty where the system holds none.`,
      });
    }
  }

  const types = Array.isArray(document.types) ? document.types : [];
  const collections = Array.isArray(document.collections) ? document.collections : [];
  const typeIds = new Set<string>();
  const collectionIds = new Set<string>();

  types.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'types', `types[${index}].id`, entry.id);
    if (typeof entry.id === 'string') {
      if (typeIds.has(entry.id)) {
        faults.push({
          path: `types[${index}].id`,
          section: 'types',
          message: `Two types carry the name ${entry.id}.`,
          fix: 'Give each type its own name.',
        });
      }
      typeIds.add(entry.id);
    }
    if (entry.kind === 'Record') {
      const fields = Array.isArray(entry.fields) ? entry.fields : [];
      if (fields.length === 0) {
        faults.push({
          path: `types[${index}].fields`,
          section: 'types',
          message: `The record ${String(entry.id)} holds no field.`,
          fix: 'Add a field, so the record carries something.',
        });
      }
      fields.forEach((field, position) => {
        if (isRecord(field) === false) return;
        checkName(faults, 'types', `types[${index}].fields[${position}].name`, field.name);
        checkTypeExpression(faults, 'types', `types[${index}].fields[${position}].type`, field.type);
      });
    } else if (entry.kind === 'Enumeration') {
      const variants = Array.isArray(entry.variants) ? entry.variants : [];
      if (variants.length === 0) {
        faults.push({
          path: `types[${index}].variants`,
          section: 'types',
          message: `The enumeration ${String(entry.id)} names no alternative.`,
          fix: 'Add an alternative, so a value has something to hold.',
        });
      }
    }
  });

  collections.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'collections', `collections[${index}].id`, entry.id);
    if (typeof entry.id === 'string') collectionIds.add(entry.id);
    checkName(faults, 'collections', `collections[${index}].record_type`, entry.record_type);
    if (typeof entry.record_type === 'string' && typeIds.has(entry.record_type) === false) {
      faults.push({
        path: `collections[${index}].record_type`,
        section: 'collections',
        message: `The collection ${String(entry.id)} names the record type ${entry.record_type}, which the Blueprint lacks.`,
        fix: `Declare a record type named ${entry.record_type}, or point the collection at a record type the Blueprint holds.`,
      });
    }
    checkMember(
      faults,
      'collections',
      `collections[${index}].privacy`,
      entry.privacy,
      Object.keys(SCHEMA_NAMES.privacy),
    );
    const retention = entry.retention;
    if (isRecord(retention)) {
      if (typeof retention.period_days !== 'number' || retention.period_days < 1) {
        faults.push({
          path: `collections[${index}].retention.period_days`,
          section: 'collections',
          message: 'A retention period holds at least one day.',
          fix: 'Set the period to a whole number of days, one or more.',
        });
      }
      checkMember(
        faults,
        'collections',
        `collections[${index}].retention.on_expiry`,
        retention.on_expiry,
        EXPIRY_NAMES,
      );
    } else {
      faults.push({
        path: `collections[${index}].retention`,
        section: 'collections',
        message: `The collection ${String(entry.id)} declares no retention.`,
        fix: 'State how long the records stay and what happens when the period ends.',
      });
    }
    const purpose = entry.purpose;
    if (isRecord(purpose) === false || typeof purpose.statement !== 'string' || purpose.statement.trim().length === 0) {
      faults.push({
        path: `collections[${index}].purpose`,
        section: 'collections',
        message: `The collection ${String(entry.id)} states no purpose.`,
        fix: 'Write one sentence stating why the deployment holds this data.',
      });
    } else {
      checkMember(
        faults,
        'collections',
        `collections[${index}].purpose.lawful_basis`,
        purpose.lawful_basis,
        LAWFUL_BASIS_NAMES,
      );
    }
  });

  const identities = isRecord(document.identities) ? document.identities : {};
  const roles = Array.isArray(identities.roles) ? identities.roles : [];
  const roleIds = new Set(
    roles.filter(isRecord).map((role) => String(role.id ?? '')),
  );
  roles.filter(isRecord).forEach((role, index) => {
    checkName(faults, 'identities', `identities.roles[${index}].id`, role.id);
  });

  const permissions = Array.isArray(document.permissions) ? document.permissions : [];
  permissions.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    if (typeof entry.role === 'string' && roleIds.has(entry.role) === false) {
      faults.push({
        path: `permissions[${index}].role`,
        section: 'permissions',
        message: `The permission names the role ${entry.role}, which the Blueprint lacks.`,
        fix: `Add a role named ${entry.role} under identities, or point the permission at a role the Blueprint holds.`,
      });
    }
    if (typeof entry.collection === 'string' && collectionIds.has(entry.collection) === false) {
      faults.push({
        path: `permissions[${index}].collection`,
        section: 'permissions',
        message: `The permission names the collection ${entry.collection}, which the Blueprint lacks.`,
        fix: `Add a collection named ${entry.collection}, or point the permission at a collection the Blueprint holds.`,
      });
    }
    const capabilities = Array.isArray(entry.capabilities) ? entry.capabilities : [];
    capabilities.forEach((capability, position) => {
      checkMember(
        faults,
        'permissions',
        `permissions[${index}].capabilities[${position}]`,
        capability,
        Object.keys(SCHEMA_NAMES.capability),
      );
    });
  });

  const rules = Array.isArray(document.rules) ? document.rules : [];
  rules.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'rules', `rules[${index}].id`, entry.id);
    if (typeof entry.statement !== 'string' || entry.statement.trim().length === 0) {
      faults.push({
        path: `rules[${index}].statement`,
        section: 'rules',
        message: `The rule ${String(entry.id)} states nothing in plain words.`,
        fix: 'Write one sentence a person reads when the rule declines a change.',
      });
    }
    checkMember(faults, 'rules', `rules[${index}].kind`, entry.kind, [
      'Invariant',
      'Precondition',
    ]);
  });

  const actions = Array.isArray(document.actions) ? document.actions : [];
  actions.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'actions', `actions[${index}].id`, entry.id);
    if (entry.class !== undefined) {
      checkMember(
        faults,
        'actions',
        `actions[${index}].class`,
        entry.class,
        TRANSACTION_CLASS_NAMES,
      );
    }
    const roleList = Array.isArray(entry.roles) ? entry.roles : [];
    roleList.forEach((role, position) => {
      if (typeof role === 'string' && roleIds.has(role) === false) {
        faults.push({
          path: `actions[${index}].roles[${position}]`,
          section: 'actions',
          message: `The action ${String(entry.id)} names the role ${role}, which the Blueprint lacks.`,
          fix: `Add a role named ${role} under identities, or name a role the Blueprint holds.`,
        });
      }
    });
  });

  const workflows = Array.isArray(document.workflows) ? document.workflows : [];
  workflows.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'workflows', `workflows[${index}].id`, entry.id);
    if (typeof entry.collection === 'string' && collectionIds.has(entry.collection) === false) {
      faults.push({
        path: `workflows[${index}].collection`,
        section: 'workflows',
        message: `The workflow ${String(entry.id)} names the collection ${entry.collection}, which the Blueprint lacks.`,
        fix: `Add a collection named ${entry.collection}, or point the workflow at a collection the Blueprint holds.`,
      });
    }
    const states = Array.isArray(entry.states) ? entry.states : [];
    const stateIds = new Set(states.filter(isRecord).map((state) => String(state.id ?? '')));
    if (typeof entry.initial_state === 'string' && stateIds.has(entry.initial_state) === false) {
      faults.push({
        path: `workflows[${index}].initial_state`,
        section: 'workflows',
        message: `The workflow ${String(entry.id)} opens in the state ${entry.initial_state}, which it lacks.`,
        fix: `Add a state named ${entry.initial_state}, or open the workflow in a state it holds.`,
      });
    }
    const transitions = Array.isArray(entry.transitions) ? entry.transitions : [];
    transitions.filter(isRecord).forEach((transition, position) => {
      for (const side of ['from_state', 'to_state'] as const) {
        const value = transition[side];
        if (typeof value === 'string' && stateIds.has(value) === false) {
          faults.push({
            path: `workflows[${index}].transitions[${position}].${side}`,
            section: 'workflows',
            message: `The workflow ${String(entry.id)} moves to the state ${value}, which it lacks.`,
            fix: `Add a state named ${value}, or point the move at a state the workflow holds.`,
          });
        }
      }
    });
  });

  const views = Array.isArray(document.views) ? document.views : [];
  views.forEach((entry, index) => {
    if (isRecord(entry) === false) return;
    checkName(faults, 'views', `views[${index}].id`, entry.id);
    if (typeof entry.collection === 'string' && collectionIds.has(entry.collection) === false) {
      faults.push({
        path: `views[${index}].collection`,
        section: 'views',
        message: `The screen ${String(entry.id)} reads the collection ${entry.collection}, which the Blueprint lacks.`,
        fix: `Add a collection named ${entry.collection}, or point the screen at a collection the Blueprint holds.`,
      });
    }
    const sorts = Array.isArray(entry.sort) ? entry.sort : [];
    sorts.filter(isRecord).forEach((sort, position) => {
      checkMember(
        faults,
        'views',
        `views[${index}].sort[${position}].direction`,
        sort.direction,
        SORT_DIRECTION_NAMES.length > 0 ? SORT_DIRECTION_NAMES : ['Ascending', 'Descending'],
      );
    });
  });

  const integrations = isRecord(document.integrations) ? document.integrations : {};
  const bridges = Array.isArray(integrations.bridges) ? integrations.bridges : [];
  bridges.filter(isRecord).forEach((bridge, index) => {
    checkMember(
      faults,
      'integrations',
      `integrations.bridges[${index}].direction`,
      bridge.direction,
      Object.keys(SCHEMA_NAMES.bridgeDirection),
    );
  });

  const governance = isRecord(document.governance) ? document.governance : {};
  const quorum = isRecord(governance.quorum) ? governance.quorum : {};
  for (const name of ['routine', 'financial', 'structural', 'constitutional'] as const) {
    const value = quorum[name];
    if (typeof value !== 'number' || value < 1 || value > 100) {
      faults.push({
        path: `governance.quorum.${name}`,
        section: 'governance',
        message: `The ${name} threshold holds a share between 1 and 100.`,
        fix: `Set the ${name} threshold to a whole number of percent between 1 and 100.`,
      });
    }
  }

  return faults;
}

/** Reports whether one document passes every check. */
export function blueprintPasses(document: unknown): boolean {
  return validateBlueprint(document).length === 0;
}

/* Reading and writing the document text -------------------------------- */

export type DocumentReading = {
  document?: Blueprint;
  faults: SchemaFault[];
};

/** Writes one Blueprint as the text a person edits. */
export function writeBlueprintText(document: Blueprint): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}

/**
 * Reads the text back into a Blueprint and checks it.
 * Writing a document and reading the text answers with the same document, so
 * level four round-trips.
 */
export function readBlueprintText(text: string): DocumentReading {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return {
      faults: [
        {
          path: '',
          section: 'document',
          message: `Cerulea could not read this document. ${cause instanceof Error ? cause.message : String(cause)}`,
          fix: 'Correct the punctuation, then read the document again.',
        },
      ],
    };
  }
  const faults = validateBlueprint(parsed);
  return { document: faults.length === 0 ? (parsed as Blueprint) : undefined, faults };
}

/** Groups the faults by the section they sit in. */
export function faultsBySection(
  faults: SchemaFault[],
): Array<{ section: BlueprintSection | 'document'; faults: SchemaFault[] }> {
  const bySection = new Map<BlueprintSection | 'document', SchemaFault[]>();
  for (const fault of faults) {
    const list = bySection.get(fault.section);
    if (list) list.push(fault);
    else bySection.set(fault.section, [fault]);
  }
  return Array.from(bySection.entries()).map(([section, list]) => ({ section, faults: list }));
}
