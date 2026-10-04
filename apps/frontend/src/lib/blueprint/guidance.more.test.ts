import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from './document';
import { fixFor, type GuidanceEntry } from './guidance';
import type { Action, Blueprint, Collection, RecordTypeDefinition, Rule, Workflow } from './types';

const berthRecord: RecordTypeDefinition = {
  id: 'berth_record',
  kind: 'Record',
  description: 'One berth.',
  fields: [{ name: 'label', type: { kind: 'Text' }, required: true, validation: [], description: 'The label.' }],
};

const berths: Collection = {
  id: 'berth_slot',
  record_type: 'berth_record',
  primary_key: 'berth_code',
  indexes: [],
  privacy: 'Open',
  retention: { period_days: 30, on_expiry: 'Archive' },
  purpose: { statement: 'We keep each berth.', lawful_basis: 'Contract' },
  description: 'Every berth.',
};

const bookBerth: Action = {
  id: 'book_berth',
  name: 'Book berth',
  params: [],
  preconditions: [],
  effects: [],
  emits: [],
  roles: [],
  description: 'Books one berth.',
};

const berthFlow: Workflow = {
  id: 'berth_flow',
  name: 'Berth flow',
  collection: 'berth_slot',
  state_field: 'label',
  initial_state: 'open',
  states: [{ id: 'open', name: 'Open', terminal: false }],
  transitions: [],
  timers: [],
};

function rule(id: string, statement: string): Rule {
  return {
    id,
    kind: 'Invariant',
    statement,
    expression: { kind: 'Literal', value: { kind: 'Boolean', value: true } },
    collections: [],
  };
}

function blueprint(): Blueprint {
  const held = readBlueprintDocument({}, 'Berth register');
  return {
    ...held,
    types: [berthRecord],
    collections: [berths],
    actions: [bookBerth],
    workflows: [berthFlow],
    rules: [rule('berth_named', 'Each berth carries a label.'), rule('berth_open', '')],
  };
}

function entry(over: Partial<GuidanceEntry>): GuidanceEntry {
  return {
    code: 'validate.primary_key_absent',
    severity: 'error',
    message: 'The collection berth_slot names the primary key berth_code, which its record leaves out.',
    fix: 'Add the field.',
    section: 'collections',
    path: 'collections[0].primary_key',
    screen: 'Model, records',
    source: 'compiler',
    ...over,
  };
}

describe('a key field the record leaves out', () => {
  it('adds the key field to the record the collection keeps', () => {
    const held = blueprint();
    const fix = fixFor(entry({}), held)!;
    expect(fix.label).toBe('Add the field Berth code');
    expect(fix.plain).toBe(
      'Cerulea adds the field Berth code to the record this collection keeps, so the key reaches a field that exists.',
    );
    const next = fix.apply(held);
    const record = next.types.find((type) => type.id === 'berth_record') as RecordTypeDefinition;
    expect(record.fields.map((field) => field.name)).toEqual(['label', 'berth_code']);
    expect(record.fields[1]).toEqual({
      name: 'berth_code',
      type: { kind: 'Text' },
      required: true,
      validation: [],
      description: 'The value naming one berth slot record.',
    });
  });

  it('leaves the Blueprint as it is when the collection or its record is absent', () => {
    const held = blueprint();
    const beyond = fixFor(entry({ path: 'collections[4].primary_key' }), held)!;
    expect(beyond.apply(held)).toBe(held);
    const orphan: Blueprint = { ...held, types: [] };
    expect(fixFor(entry({}), orphan)!.apply(orphan)).toBe(orphan);
  });

  it('offers nothing when the message names no field or the path names no place', () => {
    expect(fixFor(entry({ message: 'A key is absent.' }), blueprint())).toBeUndefined();
    expect(fixFor(entry({ path: 'collections' }), blueprint())).toBeUndefined();
  });
});

describe('finding the action by its name', () => {
  it('names the class of the action the entry names when the path holds no place', () => {
    const held = blueprint();
    const fix = fixFor(
      entry({ code: 'schema.action_class_absent', path: 'actions', elementId: 'book_berth', message: '' }),
      held,
    )!;
    expect(fix.label).toBe('Name the class');
    expect(fix.apply(held).actions[0].class).toBe('Routine');
  });

  it('leaves the Blueprint alone when no action carries that name', () => {
    const held = blueprint();
    const fix = fixFor(
      entry({ code: 'classes.declared_below_effects', path: 'actions', elementId: 'absent_action', message: '' }),
      held,
    )!;
    expect(fix.label).toBe('Raise the class');
    expect(fix.apply(held)).toBe(held);
  });

  it('raises a structural action to constitutional', () => {
    const held = { ...blueprint(), actions: [{ ...bookBerth, class: 'Structural' as const }] };
    const fix = fixFor(entry({ code: 'classes.declared_below_effects', path: 'actions[0].class', message: '' }), held)!;
    expect(fix.apply(held).actions[0].class).toBe('Constitutional');
  });
});

describe('finding the workflow by its name', () => {
  it('adds the state the move names to the workflow the entry names', () => {
    const held = blueprint();
    const fix = fixFor(
      entry({
        code: 'validate.workflow_state_absent',
        message: 'The workflow berth_flow moves to the state sealed_off, which it lacks.',
        path: 'workflows',
        elementId: 'berth_flow',
      }),
      held,
    )!;
    expect(fix.label).toBe('Add the state Sealed off');
    expect(fix.apply(held).workflows[0].states).toEqual([
      { id: 'open', name: 'Open', terminal: false },
      { id: 'sealed_off', name: 'Sealed off', terminal: false },
    ]);
  });

  it('leaves the Blueprint alone when the state already stands or the workflow is absent', () => {
    const held = blueprint();
    const present = fixFor(
      entry({
        code: 'schema.workflow_initial_state_absent',
        message: 'The workflow berth_flow opens in the state open, which it lacks.',
        path: 'workflows[0].initial_state',
      }),
      held,
    )!;
    expect(present.apply(held)).toBe(held);
    const absent = fixFor(
      entry({
        code: 'schema.workflow_state_absent',
        message: 'The workflow ghost_flow moves to the state closed, which it lacks.',
        path: 'workflows',
        elementId: 'ghost_flow',
      }),
      held,
    )!;
    expect(absent.apply(held)).toBe(held);
  });

  it('offers nothing when the message names no state', () => {
    expect(fixFor(entry({ code: 'schema.workflow_state_absent', message: 'A state is absent.' }), blueprint())).toBeUndefined();
  });
});

describe('the constitutional delay', () => {
  it('sets the delay to one hundred blocks and keeps the rest of the governance', () => {
    const held = blueprint();
    const fix = fixFor(entry({ code: 'validate.constitutional_delay_absent', path: 'governance' }), held)!;
    expect(fix.label).toBe('Set the delay');
    const next = fix.apply({ ...held, governance: { ...held.governance, constitutional_delay_blocks: 0 } });
    expect(next.governance.constitutional_delay_blocks).toBe(100);
    expect(next.governance.quorum).toEqual(held.governance.quorum);
  });
});

describe('the rule sentence', () => {
  it('writes the sentence for the named rule and keeps every other rule', () => {
    const held = blueprint();
    const fix = fixFor(entry({ code: 'schema.rule_statement_absent', path: 'rules[1].statement' }), held)!;
    const next = fix.apply(held);
    expect(next.rules[0]).toBe(held.rules[0]);
    expect(next.rules[1].statement).toBe('Berth open holds before the change is accepted.');
  });

  it('leaves the Blueprint alone when the rule is absent and offers nothing with no place', () => {
    const held = blueprint();
    expect(fixFor(entry({ code: 'schema.rule_statement_absent', path: 'rules[9].statement' }), held)!.apply(held)).toBe(held);
    expect(fixFor(entry({ code: 'schema.rule_statement_absent', path: 'rules' }), held)).toBeUndefined();
  });
});

describe('fixes that point past the end of a list', () => {
  it('leaves the Blueprint alone for a purpose or a retention beyond the collections', () => {
    const held = blueprint();
    expect(fixFor(entry({ code: 'schema.purpose_absent', path: 'collections[3].purpose' }), held)!.apply(held)).toBe(held);
    expect(fixFor(entry({ code: 'schema.retention_absent', path: 'collections[3].retention' }), held)!.apply(held)).toBe(held);
    expect(fixFor(entry({ code: 'schema.purpose_absent', path: 'collections' }), held)).toBeUndefined();
    expect(fixFor(entry({ code: 'schema.retention_period', path: 'collections' }), held)).toBeUndefined();
  });

  it('adds no screen when the Blueprint holds no collection or the screen already stands', () => {
    const held = blueprint();
    const fix = fixFor(entry({ code: 'manifest.no_interface', path: 'views' }), held)!;
    const empty = { ...held, collections: [] };
    expect(fix.apply(empty)).toBe(empty);
    const once = fix.apply(held);
    expect(once.views.map((view) => view.id)).toEqual(['berth_slot_list']);
    expect(once.views[0].projection).toEqual(['label']);
    expect(fix.apply(once)).toBe(once);
  });

  it('declares a record type for the first collection when the path holds no place', () => {
    const held = { ...blueprint(), types: [] };
    const fix = fixFor(
      entry({
        code: 'schema.record_type_absent',
        message: 'The collection berth_slot names the record type berth_record, which the Blueprint lacks.',
        path: 'collections',
      }),
      held,
    )!;
    const next = fix.apply(held);
    expect(next.types).toHaveLength(1);
    expect((next.types[0] as RecordTypeDefinition).fields[0].name).toBe('berth_code');
  });
});
