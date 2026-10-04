import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from './document';
import {
  addWorkflowState,
  putRole,
  putRule,
  putTimer,
  putTransition,
  putType,
  removeCollection,
  removeRule,
  removeWorkflow,
  removeWorkflowState,
} from './edit';
import type { Action, Blueprint, Rule, Workflow } from './types';

function rule(id: string, statement: string): Rule {
  return {
    id,
    kind: 'Invariant',
    statement,
    expression: { kind: 'Literal', value: { kind: 'Boolean', value: true } },
    collections: [],
  };
}

function action(id: string, preconditions: string[]): Action {
  return { id, name: id, params: [], preconditions, effects: [], emits: [], roles: [], description: '' };
}

function flow(over: Partial<Workflow> = {}): Workflow {
  return {
    id: 'berth_flow',
    name: 'Berth flow',
    collection: 'berth_slot',
    state_field: 'status',
    initial_state: 'open',
    states: [
      { id: 'open', name: 'Open', terminal: false },
      { id: 'closed', name: 'Closed', terminal: true },
    ],
    transitions: [{ id: 'close', from_state: 'open', to_state: 'closed' }],
    timers: [{ id: 'auto_close', state: 'open', after_seconds: 60, action: 'close_berth' }],
    ...over,
  };
}

function blueprint(): Blueprint {
  return {
    ...readBlueprintDocument({}, 'Berth register'),
    types: [{ id: 'berth_record', kind: 'Enumeration', variants: ['A'], description: 'First.' }],
    rules: [rule('berth_named', 'Each berth carries a label.'), rule('berth_open', 'A berth opens first.')],
    actions: [action('book_berth', ['berth_named', 'berth_open']), action('free_berth', ['berth_open'])],
    workflows: [flow(), flow({ id: 'dock_flow' })],
    identities: { ...readBlueprintDocument({}, 'x').identities, roles: [{ id: 'clerk', name: 'Clerk', credentials: [] }] },
  };
}

describe('removing a collection Cerulea does not hold', () => {
  it('keeps every type', () => {
    const held = blueprint();
    const next = removeCollection(held, 'absent_collection');
    expect(next.types).toBe(held.types);
    expect(next.collections).toEqual([]);
  });
});

describe('replacing an entry that already stands', () => {
  it('replaces a type in place', () => {
    const next = putType(blueprint(), { id: 'berth_record', kind: 'Enumeration', variants: ['B'], description: 'Second.' });
    expect(next.types).toEqual([{ id: 'berth_record', kind: 'Enumeration', variants: ['B'], description: 'Second.' }]);
  });

  it('replaces a role in place', () => {
    const next = putRole(blueprint(), { id: 'clerk', name: 'Senior clerk', credentials: ['licence'] });
    expect(next.identities.roles).toEqual([{ id: 'clerk', name: 'Senior clerk', credentials: ['licence'] }]);
  });
});

describe('rules', () => {
  it('adds a new rule at the end and replaces a held rule in place', () => {
    const added = putRule(blueprint(), rule('berth_paid', 'A berth is paid for.'));
    expect(added.rules.map((entry) => entry.id)).toEqual(['berth_named', 'berth_open', 'berth_paid']);
    const replaced = putRule(added, rule('berth_named', 'Each berth carries a name.'));
    expect(replaced.rules.map((entry) => entry.statement)).toEqual([
      'Each berth carries a name.',
      'A berth opens first.',
      'A berth is paid for.',
    ]);
  });

  it('removes a rule and every precondition naming it', () => {
    const next = removeRule(blueprint(), 'berth_open');
    expect(next.rules.map((entry) => entry.id)).toEqual(['berth_named']);
    expect(next.actions.map((entry) => [entry.id, entry.preconditions])).toEqual([
      ['book_berth', ['berth_named']],
      ['free_berth', []],
    ]);
  });
});

describe('workflows', () => {
  it('removes one workflow and keeps the others', () => {
    expect(removeWorkflow(blueprint(), 'berth_flow').workflows.map((entry) => entry.id)).toEqual(['dock_flow']);
  });

  it('replaces a state that already stands and keeps the initial state', () => {
    const next = addWorkflowState(flow(), { id: 'closed', name: 'Shut', terminal: false });
    expect(next.states).toEqual([
      { id: 'open', name: 'Open', terminal: false },
      { id: 'closed', name: 'Shut', terminal: false },
    ]);
    expect(next.initial_state).toBe('open');
  });

  it('points the initial state at the first state when the held one is absent', () => {
    const next = addWorkflowState(flow({ initial_state: 'draft' }), { id: 'sealed', name: 'Sealed', terminal: true });
    expect(next.initial_state).toBe('open');
  });

  it('keeps the initial state when another state is removed', () => {
    const next = removeWorkflowState(flow(), 'closed');
    expect(next.initial_state).toBe('open');
    expect(next.states.map((state) => state.id)).toEqual(['open']);
    expect(next.transitions).toEqual([]);
    expect(next.timers).toHaveLength(1);
  });

  it('replaces a move and a timer that already stand', () => {
    const moved = putTransition(flow(), { id: 'close', from_state: 'open', to_state: 'closed', action: 'close_berth' });
    expect(moved.transitions).toEqual([
      { id: 'close', from_state: 'open', to_state: 'closed', action: 'close_berth' },
    ]);
    const timed = putTimer(flow(), { id: 'auto_close', state: 'open', after_seconds: 120, action: 'close_berth' });
    expect(timed.timers).toEqual([{ id: 'auto_close', state: 'open', after_seconds: 120, action: 'close_berth' }]);
  });
});
