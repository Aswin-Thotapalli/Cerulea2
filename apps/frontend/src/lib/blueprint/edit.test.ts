import { describe, expect, it } from 'vitest';

import {
  FIELD_KINDS,
  FLOATING_POINT_NOTE,
  PRIVACY_MEANING,
  addWorkflowState,
  deadEndStates,
  permissionFor,
  putCollection,
  putFields,
  putRole,
  putTimer,
  putTransition,
  putWorkflow,
  recordTypeOf,
  removeAction,
  removeCollection,
  removeRole,
  removeWorkflowState,
  setCapabilities,
  unreachableStates,
} from './edit';
import { applyComposition, composeSections } from './compose';
import { readBlueprintDocument } from './document';
import type { Blueprint, Workflow } from './types';

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

const workflow: Workflow = {
  id: 'berth_booking',
  name: 'Berth booking',
  collection: 'user',
  state_field: 'status',
  initial_state: 'requested',
  states: [
    { id: 'requested', name: 'Requested', terminal: false },
    { id: 'approved', name: 'Approved', terminal: false },
    { id: 'closed', name: 'Closed', terminal: true },
  ],
  transitions: [
    { id: 'approve', from_state: 'requested', to_state: 'approved' },
    { id: 'finish', from_state: 'approved', to_state: 'closed' },
  ],
  timers: [],
};

describe('the field kinds a person picks from', () => {
  it('covers the Blueprint primitive set and never floating point', () => {
    const kinds = FIELD_KINDS.map((entry) => entry.kind);
    for (const wanted of [
      'Text',
      'Integer',
      'Decimal',
      'Boolean',
      'Timestamp',
      'Identity',
      'Hash',
      'Reference',
      'Named',
      'List',
      'Map',
      'Optional',
    ]) {
      expect(kinds).toContain(wanted);
    }
    expect(JSON.stringify(kinds)).not.toMatch(/Float|Double/);
    expect(FLOATING_POINT_NOTE).toMatch(/fixed scale/);
  });

  it('states what every kind and every privacy class means', () => {
    for (const entry of FIELD_KINDS) expect(entry.meaning.length).toBeGreaterThan(15);
    for (const value of Object.values(PRIVACY_MEANING)) expect(value.length).toBeGreaterThan(15);
  });
});

describe('collections and fields', () => {
  it('replaces a collection and keeps every other section', () => {
    const blueprint = seeded();
    const held = blueprint.collections[0];
    const next = putCollection(blueprint, { ...held, privacy: 'Encrypted' });
    expect(next.collections[0].privacy).toBe('Encrypted');
    expect(next.types).toEqual(blueprint.types);
    expect(next.collections).toHaveLength(blueprint.collections.length);
  });

  it('removes a collection with its record type, its permissions and its workflows', () => {
    let blueprint = seeded();
    blueprint = setCapabilities(putRole(blueprint, { id: 'clerk', name: 'Clerk', credentials: [] }), {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read'],
    });
    blueprint = putWorkflow(blueprint, workflow);
    const next = removeCollection(blueprint, 'user');
    expect(next.collections.some((entry) => entry.id === 'user')).toBe(false);
    expect(next.types.some((entry) => entry.id === 'user_record')).toBe(false);
    expect(next.permissions).toHaveLength(0);
    expect(next.workflows).toHaveLength(0);
  });

  it('replaces the fields of one record type', () => {
    const blueprint = seeded();
    const collection = blueprint.collections[0];
    const record = recordTypeOf(blueprint, collection);
    expect(record).not.toBeNull();
    const next = putFields(blueprint, collection.record_type, [
      {
        name: 'id',
        type: { kind: 'Text' },
        required: true,
        validation: [],
        description: 'The key.',
      },
    ]);
    expect(recordTypeOf(next, collection)?.fields).toHaveLength(1);
  });
});

describe('roles and the permission matrix', () => {
  it('sets the capabilities one role holds over one collection', () => {
    let blueprint = putRole(seeded(), { id: 'clerk', name: 'Clerk', credentials: [] });
    blueprint = setCapabilities(blueprint, {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read', 'Update'],
      fields: ['email'],
    });
    const entry = permissionFor(blueprint, 'clerk', 'user');
    expect(entry?.capabilities).toEqual(['Read', 'Update']);
    expect(entry?.fields).toEqual(['email']);
    expect(entry?.id).toBe('clerk_on_user');
  });

  it('removes the entry when a role holds no capability over a collection', () => {
    let blueprint = putRole(seeded(), { id: 'clerk', name: 'Clerk', credentials: [] });
    blueprint = setCapabilities(blueprint, {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read'],
    });
    blueprint = setCapabilities(blueprint, {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: [],
    });
    expect(permissionFor(blueprint, 'clerk', 'user')).toBeNull();
  });

  it('removes a role with its permissions and its authority', () => {
    let blueprint = putRole(seeded(), { id: 'clerk', name: 'Clerk', credentials: [] });
    blueprint = {
      ...blueprint,
      governance: { ...blueprint.governance, authority: ['owner', 'clerk'] },
    };
    blueprint = setCapabilities(blueprint, {
      roleId: 'clerk',
      collectionId: 'user',
      capabilities: ['Read'],
    });
    const next = removeRole(blueprint, 'clerk');
    expect(next.identities.roles.some((entry) => entry.id === 'clerk')).toBe(false);
    expect(next.permissions).toHaveLength(0);
    expect(next.governance.authority).toEqual(['owner']);
  });
});

describe('actions and workflows', () => {
  it('clears an action from every transition and timer that named it', () => {
    let blueprint = putWorkflow(seeded(), {
      ...workflow,
      transitions: [{ id: 'approve', from_state: 'requested', to_state: 'approved', action: 'approve_booking' }],
      timers: [{ id: 'lapse', state: 'requested', after_seconds: 600, action: 'approve_booking' }],
    });
    blueprint = {
      ...blueprint,
      actions: [
        {
          id: 'approve_booking',
          name: 'Approve the booking',
          params: [],
          preconditions: [],
          effects: [{ kind: 'Require', rule: 'r' }],
          emits: [],
          roles: ['owner'],
          description: '',
        },
      ],
    };
    const next = removeAction(blueprint, 'approve_booking');
    expect(next.actions).toHaveLength(0);
    expect(next.workflows[0].transitions[0].action).toBeUndefined();
    expect(next.workflows[0].timers).toHaveLength(0);
  });

  it('keeps the initial state pointing at a state that exists', () => {
    const shortened = removeWorkflowState(workflow, 'requested');
    expect(shortened.initial_state).toBe('approved');
    expect(shortened.transitions.map((entry) => entry.id)).toEqual(['finish']);
  });

  it('adds a state and a timer without touching the rest', () => {
    const wider = putTimer(
      addWorkflowState(workflow, { id: 'held', name: 'Held', terminal: false }),
      { id: 'lapse', state: 'held', after_seconds: 86400, action: 'close_booking' },
    );
    expect(wider.states).toHaveLength(4);
    expect(wider.timers).toHaveLength(1);
  });

  it('reports a state no transition reaches', () => {
    const wider = addWorkflowState(workflow, { id: 'held', name: 'Held', terminal: false });
    expect(unreachableStates(wider)).toEqual(['held']);
    expect(unreachableStates(workflow)).toEqual([]);
  });

  it('reports a state that strands a record', () => {
    const stranded = putTransition(
      addWorkflowState(workflow, { id: 'held', name: 'Held', terminal: false }),
      { id: 'hold', from_state: 'requested', to_state: 'held' },
    );
    expect(deadEndStates(stranded)).toEqual(['held']);
    expect(deadEndStates(workflow)).toEqual([]);
  });
});
