import { describe, expect, it } from 'vitest';

import {
  IDENTIFIER_LIMIT,
  faultsBySection,
  readBlueprintText,
  validateBlueprint,
  type SchemaFault,
} from './validate';

type Doc = Record<string, unknown>;

// A small document built by hand. Every check passes on it.
function sound(): Doc {
  return {
    schema_version: '1.0.0',
    name: 'Berth register',
    types: [
      {
        id: 'berth',
        kind: 'Record',
        fields: [
          { name: 'label', type: { kind: 'Text' } },
          { name: 'price', type: { kind: 'Decimal', scale: 2 } },
          { name: 'tags', type: { kind: 'List', element: { kind: 'Text' } } },
          { name: 'ledger', type: { kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Integer' } } },
          { name: 'note', type: { kind: 'Optional', inner: { kind: 'Hash' } } },
          { name: 'owner', type: { kind: 'Reference', collection: 'berths' } },
          { name: 'state', type: { kind: 'Named', name: 'berth_state' } },
        ],
      },
      { id: 'berth_state', kind: 'Enumeration', variants: ['Open', 'Closed'] },
    ],
    collections: [
      {
        id: 'berths',
        record_type: 'berth',
        privacy: 'Open',
        retention: { period_days: 30, on_expiry: 'Archive' },
        purpose: { statement: 'We keep each berth.', lawful_basis: 'Contract' },
      },
    ],
    identities: { roles: [{ id: 'clerk' }] },
    permissions: [{ role: 'clerk', collection: 'berths', capabilities: ['Read', 'Create'] }],
    rules: [{ id: 'berth_named', statement: 'Each berth carries a label.', kind: 'Invariant' }],
    actions: [{ id: 'book_berth', class: 'Routine', roles: ['clerk'] }],
    workflows: [
      {
        id: 'berth_flow',
        collection: 'berths',
        initial_state: 'open',
        states: [{ id: 'open' }, { id: 'closed' }],
        transitions: [{ from_state: 'open', to_state: 'closed' }],
      },
    ],
    events: [],
    views: [{ id: 'berth_list', collection: 'berths', sort: [{ direction: 'Ascending' }] }],
    integrations: { bridges: [{ direction: 'Both' }] },
    governance: {
      quorum: { routine: 51, financial: 67, structural: 80, constitutional: 90 },
    },
    economics: null,
  };
}

function withRecordField(type: unknown): Doc {
  const held = sound();
  const types = held.types as Doc[];
  types[0] = { ...types[0], fields: [{ name: 'only', type }] };
  return held;
}

function codes(faults: SchemaFault[]): string[] {
  return faults.map((fault) => fault.code);
}

describe('the hand-built sound document', () => {
  it('passes every check', () => {
    expect(validateBlueprint(sound())).toEqual([]);
  });
});

describe('document level checks', () => {
  it('names an absent schema version and an empty name', () => {
    const held = sound();
    delete held.schema_version;
    held.name = '   ';
    const faults = validateBlueprint(held);
    expect(faults.slice(0, 2)).toEqual([
      {
        code: 'schema.schema_version_absent',
        path: 'schema_version',
        section: 'document',
        message: 'The Blueprint names no schema version.',
        fix: 'Set schema_version to three numbers joined by full stops, for example 1.0.0.',
      },
      {
        code: 'schema.name_absent',
        path: 'name',
        section: 'document',
        message: 'The Blueprint carries no name.',
        fix: 'Set name to the name this system carries.',
      },
    ]);
  });

  it('refuses an array as the whole document', () => {
    const faults = validateBlueprint([]);
    expect(codes(faults)).toEqual(['schema.document_shape']);
    expect(faults[0].message).toBe('This Blueprint is not an object.');
  });

  it('names each object section that is absent', () => {
    const held = sound();
    held.identities = [];
    held.integrations = 'none';
    held.governance = null;
    const faults = validateBlueprint(held);
    const byPath = new Map(faults.map((fault) => [fault.path, fault]));
    expect(byPath.get('identities')?.code).toBe('schema.identities_absent');
    expect(byPath.get('identities')?.fix).toContain('units, roles, credentials and delegations');
    expect(byPath.get('integrations')?.code).toBe('schema.integrations_absent');
    expect(byPath.get('integrations')?.fix).toContain('feeds, bridges and triggers');
    expect(byPath.get('governance')?.code).toBe('schema.governance_absent');
    // An absent governance section leaves every threshold unset.
    expect(
      faults.filter((fault) => fault.code === 'schema.quorum_share').map((fault) => fault.path),
    ).toEqual([
      'governance.quorum.routine',
      'governance.quorum.financial',
      'governance.quorum.structural',
      'governance.quorum.constitutional',
    ]);
  });

  it('refuses economics held as a list and accepts economics held as an object', () => {
    const listed = sound();
    listed.economics = [];
    const faults = validateBlueprint(listed);
    expect(codes(faults)).toEqual(['schema.economics_shape']);
    expect(faults[0].section).toBe('economics');

    const held = sound();
    held.economics = { unit: 'rupee' };
    expect(validateBlueprint(held)).toEqual([]);
  });

  it('names every list section held as something other than a list', () => {
    const held = sound();
    held.events = {};
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.section_absent',
        path: 'events',
        section: 'events',
        message: 'The events section is absent.',
        fix: 'Write events as a list, empty where the system holds none.',
      },
    ]);
  });
});

describe('names', () => {
  it('names an absent type name', () => {
    const held = sound();
    (held.types as Doc[])[1] = { id: '', kind: 'Enumeration', variants: ['A'] };
    const faults = validateBlueprint(held);
    expect(faults[0]).toEqual({
      code: 'schema.identifier_absent',
      path: 'types[1].id',
      section: 'types',
      message: 'This name is absent.',
      fix: 'Give it a name of lower case letters, digits and underscores, starting with a letter.',
    });
  });

  it('names a name longer than the limit', () => {
    const long = `a${'b'.repeat(IDENTIFIER_LIMIT)}`;
    const held = sound();
    (held.types as Doc[])[1] = { id: long, kind: 'Enumeration', variants: ['A'] };
    const faults = validateBlueprint(held);
    expect(faults).toHaveLength(1);
    expect(faults[0].code).toBe('schema.identifier_long');
    expect(faults[0].message).toBe(`The name ${long} runs past ${IDENTIFIER_LIMIT} characters.`);
    expect(faults[0].fix).toBe(`Shorten the name to ${IDENTIFIER_LIMIT} characters or fewer.`);
  });

  it('names two types that carry one name', () => {
    const held = sound();
    (held.types as Doc[]).push({ id: 'berth_state', kind: 'Enumeration', variants: ['A'] });
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.duplicate_type',
        path: 'types[2].id',
        section: 'types',
        message: 'Two types carry the name berth_state.',
        fix: 'Give each type its own name.',
      },
    ]);
  });

  it('skips entries that are not objects in every list', () => {
    const held = sound();
    for (const section of ['types', 'collections', 'permissions', 'rules', 'actions', 'workflows', 'views']) {
      (held[section] as unknown[]).push('stray', 7, null);
    }
    expect(validateBlueprint(held)).toEqual([]);
  });

  it('checks the name of every role', () => {
    const held = sound();
    held.identities = { roles: [{ id: 'clerk' }, { id: 'Head Clerk' }, 'stray'] };
    const faults = validateBlueprint(held);
    expect(faults).toHaveLength(1);
    expect(faults[0].code).toBe('schema.identifier_refused');
    expect(faults[0].path).toBe('identities.roles[1].id');
    expect(faults[0].section).toBe('identities');
  });
});

describe('types', () => {
  it('names a record with no field', () => {
    const held = sound();
    (held.types as Doc[])[0] = { id: 'berth', kind: 'Record' };
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.record_without_field',
        path: 'types[0].fields',
        section: 'types',
        message: 'The record berth holds no field.',
        fix: 'Add a field, so the record carries something.',
      },
    ]);
  });

  it('skips a field that is not an object', () => {
    const held = sound();
    ((held.types as Doc[])[0].fields as unknown[]).push('stray');
    expect(validateBlueprint(held)).toEqual([]);
  });

  it('names an enumeration with no alternative', () => {
    const held = sound();
    (held.types as Doc[])[1] = { id: 'berth_state', kind: 'Enumeration', variants: 'Open' };
    const faults = validateBlueprint(held);
    expect(faults).toHaveLength(1);
    expect(faults[0].code).toBe('schema.enumeration_without_variant');
    expect(faults[0].message).toBe('The enumeration berth_state names no alternative.');
  });

  it('names an absent field type', () => {
    const faults = validateBlueprint(withRecordField({ name: 'Text' }));
    expect(faults).toEqual([
      {
        code: 'schema.type_absent',
        path: 'types[0].fields[0].type',
        section: 'types',
        message: 'This type is absent.',
        fix: 'Name a type, for example Text, Integer, Boolean, Bytes, Timestamp, Identity, Hash.',
      },
    ]);
  });

  it('names a type kind the Blueprint lacks', () => {
    const faults = validateBlueprint(withRecordField({ kind: 'Float' }));
    expect(faults).toHaveLength(1);
    expect(faults[0].code).toBe('schema.type_unknown');
    expect(faults[0].message).toBe('The Blueprint holds no type named Float.');
    expect(faults[0].fix).toContain('Decimal, List, Map, Optional, Reference or Named');
  });

  it('refuses a negative scale and a scale that is absent', () => {
    const negative = validateBlueprint(withRecordField({ kind: 'Decimal', scale: -1 }));
    expect(codes(negative)).toEqual(['schema.decimal_scale']);
    expect(negative[0].path).toBe('types[0].fields[0].type.scale');
    const absent = validateBlueprint(withRecordField({ kind: 'Decimal' }));
    expect(codes(absent)).toEqual(['schema.decimal_scale']);
  });

  it('walks into lists, maps and optionals to find a broken inner type', () => {
    const faults = validateBlueprint(
      withRecordField({
        kind: 'Map',
        key: { kind: 'List', element: { kind: 'Nothing' } },
        value: { kind: 'Optional', inner: null },
      }),
    );
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.type_unknown', 'types[0].fields[0].type.key.element'],
      ['schema.type_absent', 'types[0].fields[0].type.value.inner'],
    ]);
  });

  it('checks the names a reference and a named type carry', () => {
    const reference = validateBlueprint(withRecordField({ kind: 'Reference', collection: 'Berths' }));
    expect(reference.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.identifier_refused', 'types[0].fields[0].type.collection'],
    ]);
    const named = validateBlueprint(withRecordField({ kind: 'Named' }));
    expect(named.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.identifier_absent', 'types[0].fields[0].type.name'],
    ]);
  });
});

describe('collections', () => {
  function collectionWith(patch: Doc): Doc {
    const held = sound();
    const list = held.collections as Doc[];
    list[0] = { ...list[0], ...patch };
    return held;
  }

  it('refuses a privacy word the Blueprint lacks', () => {
    const faults = validateBlueprint(collectionWith({ privacy: 'Secret' }));
    expect(faults).toEqual([
      {
        code: 'schema.value_refused',
        path: 'collections[0].privacy',
        section: 'collections',
        message: 'The Blueprint refuses the value Secret here.',
        fix: 'Use one of Open, HashOnly, Encrypted, External.',
      },
    ]);
  });

  it('refuses a retention under one day and an unknown expiry step', () => {
    const faults = validateBlueprint(
      collectionWith({ retention: { period_days: 0, on_expiry: 'Burn' } }),
    );
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.retention_period', 'collections[0].retention.period_days'],
      ['schema.value_refused', 'collections[0].retention.on_expiry'],
    ]);
    expect(faults[1].fix).toBe('Use one of Delete, Anonymise, Archive.');
  });

  it('names an absent retention', () => {
    const faults = validateBlueprint(collectionWith({ retention: undefined }));
    expect(faults).toEqual([
      {
        code: 'schema.retention_absent',
        path: 'collections[0].retention',
        section: 'collections',
        message: 'The collection berths declares no retention.',
        fix: 'State how long the records stay and what happens when the period ends.',
      },
    ]);
  });

  it('names an absent purpose and a blank purpose', () => {
    const absent = validateBlueprint(collectionWith({ purpose: null }));
    expect(codes(absent)).toEqual(['schema.purpose_absent']);
    expect(absent[0].message).toBe('The collection berths states no purpose.');
    const blank = validateBlueprint(collectionWith({ purpose: { statement: ' ', lawful_basis: 'Contract' } }));
    expect(codes(blank)).toEqual(['schema.purpose_absent']);
  });

  it('refuses a lawful basis outside the list', () => {
    const faults = validateBlueprint(
      collectionWith({ purpose: { statement: 'We keep it.', lawful_basis: 'Whim' } }),
    );
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.value_refused', 'collections[0].purpose.lawful_basis'],
    ]);
    expect(faults[0].fix).toContain('LegitimateInterest');
  });

  it('checks the record type name the collection carries', () => {
    const faults = validateBlueprint(collectionWith({ record_type: undefined }));
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.identifier_absent', 'collections[0].record_type'],
    ]);
  });
});

describe('permissions', () => {
  it('names an absent collection and a refused capability', () => {
    const held = sound();
    held.permissions = [{ role: 'clerk', collection: 'docks', capabilities: ['Read', 'Insert', 5] }];
    const faults = validateBlueprint(held);
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.collection_absent', 'permissions[0].collection'],
      ['schema.value_refused', 'permissions[0].capabilities[1]'],
      ['schema.value_refused', 'permissions[0].capabilities[2]'],
    ]);
    expect(faults[0].message).toBe(
      'The permission names the collection docks, which the Blueprint lacks.',
    );
    expect(faults[0].fix).toBe(
      'Add a collection named docks, or point the permission at a collection the Blueprint holds.',
    );
    expect(faults[1].fix).toBe('Use one of Read, Create, Update, Delete.');
    expect(faults[2].message).toBe('The Blueprint refuses the value 5 here.');
  });

  it('names an absent role with the fix', () => {
    const held = sound();
    held.permissions = [{ role: 'harbour_master', collection: 'berths' }];
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.role_absent',
        path: 'permissions[0].role',
        section: 'permissions',
        message: 'The permission names the role harbour_master, which the Blueprint lacks.',
        fix: 'Add a role named harbour_master under identities, or point the permission at a role the Blueprint holds.',
      },
    ]);
  });
});

describe('rules', () => {
  it('names a rule with no statement and a refused kind', () => {
    const held = sound();
    held.rules = [{ id: 'berth_named', statement: '', kind: 'Guideline' }];
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.rule_statement_absent',
        path: 'rules[0].statement',
        section: 'rules',
        message: 'The rule berth_named states nothing in plain words.',
        fix: 'Write one sentence a person reads when the rule declines a change.',
      },
      {
        code: 'schema.value_refused',
        path: 'rules[0].kind',
        section: 'rules',
        message: 'The Blueprint refuses the value Guideline here.',
        fix: 'Use one of Invariant, Precondition.',
      },
    ]);
  });

  it('accepts a precondition rule', () => {
    const held = sound();
    held.rules = [{ id: 'check_first', statement: 'A berth opens first.', kind: 'Precondition' }];
    expect(validateBlueprint(held)).toEqual([]);
  });
});

describe('actions', () => {
  it('names an action with no class', () => {
    const held = sound();
    held.actions = [{ id: 'book_berth' }];
    const faults = validateBlueprint(held);
    expect(codes(faults)).toEqual(['schema.action_class_absent']);
    expect(faults[0].message).toBe('The action book_berth names no transaction class.');
    expect(faults[0].fix).toContain('Use one of Routine, Financial, Structural, Constitutional.');
  });

  it('refuses a class the Blueprint lacks and names an absent role', () => {
    const held = sound();
    held.actions = [{ id: 'book_berth', class: 'Urgent', roles: ['clerk', 'pilot', 9] }];
    const faults = validateBlueprint(held);
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.value_refused', 'actions[0].class'],
      ['schema.action_role_absent', 'actions[0].roles[1]'],
    ]);
    expect(faults[1].message).toBe('The action book_berth names the role pilot, which the Blueprint lacks.');
    expect(faults[1].fix).toBe('Add a role named pilot under identities, or name a role the Blueprint holds.');
  });
});

describe('workflows', () => {
  it('names an absent collection, an absent opening state and absent move states', () => {
    const held = sound();
    held.workflows = [
      {
        id: 'berth_flow',
        collection: 'docks',
        initial_state: 'draft',
        states: [{ id: 'open' }, 'stray', { name: 'unnamed' }],
        transitions: [{ from_state: 'open', to_state: 'sealed' }, { from_state: 'gone' }, 'stray'],
      },
    ];
    const faults = validateBlueprint(held);
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.workflow_collection_absent', 'workflows[0].collection'],
      ['schema.workflow_initial_state_absent', 'workflows[0].initial_state'],
      ['schema.workflow_state_absent', 'workflows[0].transitions[0].to_state'],
      ['schema.workflow_state_absent', 'workflows[0].transitions[1].from_state'],
    ]);
    expect(faults[0].message).toBe(
      'The workflow berth_flow names the collection docks, which the Blueprint lacks.',
    );
    expect(faults[1].message).toBe('The workflow berth_flow opens in the state draft, which it lacks.');
    expect(faults[1].fix).toBe('Add a state named draft, or open the workflow in a state it holds.');
    expect(faults[2].message).toBe('The workflow berth_flow moves to the state sealed, which it lacks.');
    expect(faults[3].fix).toBe('Add a state named gone, or point the move at a state the workflow holds.');
  });

  it('accepts a workflow with no states or moves listed', () => {
    const held = sound();
    held.workflows = [{ id: 'bare_flow' }];
    expect(validateBlueprint(held)).toEqual([]);
  });
});

describe('views and bridges', () => {
  it('names a screen reading an absent collection and a refused sort direction', () => {
    const held = sound();
    held.views = [
      { id: 'berth_list', collection: 'docks', sort: [{ direction: 'Sideways' }, 'stray', { direction: 'Descending' }] },
    ];
    const faults = validateBlueprint(held);
    expect(faults.map((fault) => [fault.code, fault.path])).toEqual([
      ['schema.view_collection_absent', 'views[0].collection'],
      ['schema.value_refused', 'views[0].sort[0].direction'],
    ]);
    expect(faults[0].message).toBe('The screen berth_list reads the collection docks, which the Blueprint lacks.');
    expect(faults[0].fix).toBe(
      'Add a collection named docks, or point the screen at a collection the Blueprint holds.',
    );
    expect(faults[1].fix).toBe('Use one of Ascending, Descending.');
  });

  it('refuses a bridge direction written in the schema spelling', () => {
    const held = sound();
    held.integrations = { bridges: [{ direction: 'Inbound' }, { direction: 'BothWays' }, 'stray'] };
    const faults = validateBlueprint(held);
    expect(faults).toEqual([
      {
        code: 'schema.value_refused',
        path: 'integrations.bridges[1].direction',
        section: 'integrations',
        message: 'The Blueprint refuses the value BothWays here.',
        fix: 'Use one of Inbound, Outbound, Both.',
      },
    ]);
  });
});

describe('governance thresholds', () => {
  it('refuses a share above one hundred and a share held as text', () => {
    const held = sound();
    held.governance = { quorum: { routine: 51, financial: '67', structural: 101, constitutional: 90 } };
    const faults = validateBlueprint(held);
    expect(faults.map((fault) => fault.path)).toEqual([
      'governance.quorum.financial',
      'governance.quorum.structural',
    ]);
    expect(faults[1].message).toBe('The structural threshold holds a share between 1 and 100.');
    expect(faults[1].fix).toBe(
      'Set the structural threshold to a whole number of percent between 1 and 100.',
    );
  });
});

describe('reading text and grouping faults', () => {
  it('answers with the document when the text passes', () => {
    const reading = readBlueprintText(JSON.stringify(sound()));
    expect(reading.faults).toEqual([]);
    expect(reading.document?.name).toBe('Berth register');
  });

  it('keeps the order sections first appear in and gathers each section together', () => {
    const held = sound();
    held.rules = [{ id: 'Bad Rule', statement: '', kind: 'Invariant' }];
    held.name = '';
    const grouped = faultsBySection(validateBlueprint(held));
    expect(grouped.map((group) => [group.section, group.faults.length])).toEqual([
      ['document', 1],
      ['rules', 2],
    ]);
  });
});
