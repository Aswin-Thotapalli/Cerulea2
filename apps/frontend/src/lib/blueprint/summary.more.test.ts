import { describe, expect, it } from 'vitest';

import { readBlueprintDocument } from './document';
import { headlineFor, summariseBlueprint } from './summary';
import type { Blueprint } from './types';

// The document reader starts every Blueprint with one role. The empty case clears it.
function empty(name = 'Berth register'): Blueprint {
  const held = readBlueprintDocument({}, name);
  return {
    ...held,
    types: [],
    collections: [],
    identities: { ...held.identities, roles: [] },
    workflows: [],
    actions: [],
    rules: [],
    views: [],
  };
}

describe('summarising an empty Blueprint', () => {
  it('states in plain words that each section holds nothing yet', () => {
    const lines = summariseBlueprint(empty());
    expect(lines.map((line) => [line.section, line.sentence, line.count])).toEqual([
      ['collections', 'This system keeps no record yet.', 0],
      ['identities', 'This system names no role yet, so nobody reaches a record.', 0],
      ['workflows', 'No work moves through states in this system.', 0],
      ['actions', 'This system offers no action yet.', 0],
      ['rules', 'This system refuses nothing yet, so it accepts every value it is given.', 0],
      ['views', 'This system publishes no screen yet.', 0],
    ]);
  });

  it('heads an empty system with the way to start', () => {
    expect(headlineFor(empty())).toBe(
      'This system holds nothing yet. Pick a statement and Cerulea installs the parts it needs.',
    );
  });
});

describe('summarising a Blueprint that holds parts', () => {
  const held = {
    ...empty(),
    collections: [{ id: 'berth_slot' }, { id: 'dock_fee' }],
    identities: { ...empty().identities, roles: [{ id: 'harbour_master', name: '', credentials: [] }] },
    workflows: [{ id: 'berth_flow', name: 'Berth flow' }],
    actions: [{ id: 'book_berth', name: '' }],
    rules: [{ id: 'berth_named', statement: 'Each berth carries a label.' }],
    views: [{ id: 'berth_list', name: '' }],
  } as unknown as Blueprint;

  it('counts each section and falls back to the identifier when a name is blank', () => {
    const lines = summariseBlueprint(held);
    expect(lines.map((line) => [line.sentence, line.names])).toEqual([
      ['This system keeps 2 kinds of record.', ['Berth slot', 'Dock fee']],
      ['This system names 1 roles.', ['harbour_master']],
      ['1 kinds of work move through states.', ['Berth flow']],
      ['People take 1 actions.', ['book_berth']],
      ['This system holds 1 rules.', ['Each berth carries a label.']],
      ['This system publishes 1 screens.', ['berth_list']],
    ]);
  });

  it('heads the system with its name, its record kinds and its roles', () => {
    expect(headlineFor(held)).toBe('Berth register keeps 2 kinds of record and names 1 roles.');
  });

  it('names the system in general words when the name is blank', () => {
    expect(headlineFor({ ...held, name: '' })).toBe('This system keeps 2 kinds of record and names 1 roles.');
  });

  it('heads a system holding only a rule', () => {
    const ruled = { ...empty(), rules: held.rules };
    expect(headlineFor(ruled)).toBe('Berth register keeps 0 kinds of record and names 0 roles.');
  });
});
