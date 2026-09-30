import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import LogicEditor, { CLASS_MEANING, buildEffect } from './LogicEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { putAction, putRule } from '@/lib/blueprint/edit';
import { writeFormula } from '@/lib/blueprint/formula';
import type { Blueprint } from '@/lib/blueprint/types';

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

/** A seeded Blueprint holding one precondition and one action over the user collection. */
function withLogic(): Blueprint {
  const withRule = putRule(seeded(), {
    id: 'address_present',
    kind: 'Precondition',
    statement: 'An address is present',
    expression: {
      kind: 'Call',
      operator: 'is_present',
      arguments: [{ kind: 'Field', target: { kind: 'Param', name: 'record' }, field: 'address' }],
    },
    collections: ['user'],
  });
  return putAction(withRule, {
    id: 'open_account',
    name: 'Open an account',
    params: [],
    preconditions: [],
    effects: [buildEffect('Insert', 'user')],
    emits: [],
    class: 'Routine',
    roles: ['owner'],
    description: 'Open an account records the work in user.',
  });
}

/** Holds the Blueprint in state so the editor redraws after each change. */
function Harness({
  start,
  changes,
  moduleIds,
  chosen,
  onChosen,
}: {
  start: Blueprint;
  changes: Blueprint[];
  moduleIds?: string[];
  chosen?: string[];
  onChosen?: (next: string[]) => void;
}) {
  const [blueprint, setBlueprint] = useState(start);
  return (
    <LogicEditor
      blueprint={blueprint}
      onChange={(next) => {
        changes.push(next);
        setBlueprint(next);
      }}
      moduleIds={moduleIds}
      chosenTriggers={chosen}
      onChosenTriggersChange={onChosen}
    />
  );
}

async function pick(name: RegExp, option: string | RegExp) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

function last(changes: Blueprint[]): Blueprint {
  return changes[changes.length - 1];
}

describe('the logic editor over a held rule', { timeout: 30000 }, () => {
  it('shows the rule statement, its timing and the formula it holds', () => {
    render(<Harness start={withLogic()} changes={[]} />);
    expect(screen.getByLabelText('What this rule holds')).toHaveValue('An address is present');
    expect(
      screen.getByText('Holds before an action runs, so the action stops when it fails.'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('The formula behind address_present')).toHaveValue(
      'is_present(record.address)',
    );
    expect(
      screen.queryByText('No rule yet. A system with no rule accepts every value it is given.'),
    ).not.toBeInTheDocument();
  });

  it('writes a new statement into the rule', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What this rule holds'), {
      target: { value: 'An address always present' },
    });
    expect(last(changes).rules[0].statement).toBe('An address always present');
    expect(last(changes).rules[0].id).toBe('address_present');
  });

  it('turns a precondition into an invariant and says what that means', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    await pick(/^When it holds/, 'At every moment');
    expect(last(changes).rules[0].kind).toBe('Invariant');
    expect(
      screen.getByText('Holds at every moment, so no change may break it.'),
    ).toBeInTheDocument();
  });

  it('removes the rule and states what a system with no rule accepts', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(last(changes).rules).toEqual([]);
    expect(
      screen.getByText('No rule yet. A system with no rule accepts every value it is given.'),
    ).toBeInTheDocument();
  });

  it('writes a clean formula back into the rule', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('The formula behind address_present'), {
      target: { value: '1 > 0' },
    });
    const expression = last(changes).rules[0].expression;
    expect(expression.kind).toBe('Call');
    expect(writeFormula(expression)).toMatch(/1 > 0/);
    expect(screen.getByLabelText('The formula behind address_present')).toHaveValue(
      writeFormula(expression),
    );
  });

  it('keeps the rule unchanged while the formula carries a type fault', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('The formula behind address_present'), {
      target: { value: '1 + "one"' },
    });
    expect(changes).toHaveLength(0);
    expect(screen.getByTestId('formula-fault')).toHaveTextContent(
      'The add holds a whole number on the left and text on the right.',
    );
  });

  it('refuses a second rule that carries the same name', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Add a rule'), { target: { value: 'Address present' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[0]);
    expect(changes).toHaveLength(0);
    expect(screen.getByLabelText('Add a rule')).toHaveValue('Address present');
  });

  it('writes a rule over no collection when the Blueprint holds none', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={readBlueprintDocument({})} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Add a rule'), { target: { value: 'A key is present' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[0]);
    const rule = last(changes).rules[0];
    expect(rule.id).toBe('a_key_is_present');
    expect(rule.statement).toBe('A key is present holds before the action runs.');
    expect(rule.collections).toEqual([]);
    expect(writeFormula(rule.expression)).toBe('is_present(record.id)');
    expect(screen.getByLabelText('Add a rule')).toHaveValue('');
  });
});

describe('the logic editor over a held action', { timeout: 30000 }, () => {
  it('states what the action reads and writes and the class it commits at', () => {
    render(<Harness start={withLogic()} changes={[]} />);
    expect(
      screen.getByText(
        'Open an account reads nothing and writes user. Cerulea commits it as routine work.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('writes user')).toBeInTheDocument();
    expect(screen.getByText(CLASS_MEANING.Routine)).toBeInTheDocument();
    expect(
      screen.queryByText('No action yet. Add one so a person can change a record.'),
    ).not.toBeInTheDocument();
  });

  it('renames the action and redraws the sentence under it', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What it does'), {
      target: { value: 'Register a person' },
    });
    expect(last(changes).actions[0].name).toBe('Register a person');
    expect(
      screen.getByText(
        'Register a person reads nothing and writes user. Cerulea commits it as routine work.',
      ),
    ).toBeInTheDocument();
  });

  it('moves the action to the financial class', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    await pick(/^Kind of work/, 'Financial');
    expect(last(changes).actions[0].class).toBe('Financial');
    expect(screen.getByText(CLASS_MEANING.Financial)).toBeInTheDocument();
    expect(screen.getByText(/Cerulea commits it as financial work\./)).toBeInTheDocument();
  });

  it('links a rule the action checks first and clears it again', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    await pick(/^Rule it checks first/, 'An address is present');
    expect(last(changes).actions[0].preconditions).toEqual(['address_present']);
    await pick(/^Rule it checks first/, 'No rule');
    expect(last(changes).actions[0].preconditions).toEqual([]);
  });

  it('points an effect at another collection and keeps its kind', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    await pick(/^What it touches 1/, 'Session');
    const effect = last(changes).actions[0].effects[0];
    expect(effect.kind).toBe('Insert');
    expect('collection' in effect ? effect.collection : '').toBe('session');
    expect(screen.getByText('writes session')).toBeInTheDocument();
  });

  it('adds a read to the action and lists it in the Access Manifest', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    await pick(/^Add what it touches/, 'Read a record');
    const effects = last(changes).actions[0].effects;
    expect(effects).toHaveLength(2);
    expect(effects[1]).toEqual(buildEffect('Read', 'user'));
    expect(screen.getByText('reads user')).toBeInTheDocument();
    expect(
      screen.getByText('Open an account reads user and writes user. Cerulea commits it as routine work.'),
    ).toBeInTheDocument();
  });

  it('changes one effect of several and leaves the others alone', async () => {
    const start = putAction(withLogic(), {
      ...withLogic().actions[0],
      effects: [buildEffect('Insert', 'user'), buildEffect('Read', 'user')],
    });
    const changes: Blueprint[] = [];
    render(<Harness start={start} changes={changes} />);
    await pick(/^What it touches 2/, 'Session');
    const effects = last(changes).actions[0].effects;
    expect(effects[0]).toEqual(buildEffect('Insert', 'user'));
    expect(effects[1]).toEqual(buildEffect('Read', 'session'));
    expect(screen.getByText('reads session')).toBeInTheDocument();
  });

  it('writes a new action over the first collection with the first role', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Add an action'), {
      target: { value: 'Close a session' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[1]);
    const action = last(changes).actions[0];
    expect(action.id).toBe('close_a_session');
    expect(action.name).toBe('Close a session');
    expect(action.effects).toEqual([buildEffect('Insert', 'user')]);
    expect(action.roles).toEqual(['owner']);
    expect(action.description).toBe('Close a session records the work in user.');
    expect(screen.getByLabelText('Add an action')).toHaveValue('');
  });

  it('writes a new rule against the first field of the first collection', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Add a rule'), { target: { value: 'Key present' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[0]);
    const rule = last(changes).rules[0];
    expect(rule.collections).toEqual(['user']);
    expect(writeFormula(rule.expression)).toBe('is_present(record.id)');
  });

  it('removes the action and states that none is left', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove this action' }));
    expect(last(changes).actions).toEqual([]);
    expect(
      screen.getByText('No action yet. Add one so a person can change a record.'),
    ).toBeInTheDocument();
  });

  it('refuses a second action that carries the same name', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withLogic()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Add an action'), { target: { value: 'Open account' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[1]);
    expect(changes).toHaveLength(0);
  });

  it('holds the add button shut while no collection exists', () => {
    render(<Harness start={readBlueprintDocument({})} changes={[]} />);
    fireEvent.change(screen.getByLabelText('Add an action'), { target: { value: 'Open account' } });
    expect(screen.getAllByRole('button', { name: 'Add it' })[1]).toBeDisabled();
  });
});

describe('the triggers the logic editor offers', { timeout: 30000 }, () => {
  it('adds a pair when a person switches it on', () => {
    const chosen: string[][] = [];
    render(
      <Harness
        start={seeded()}
        changes={[]}
        moduleIds={['analytics', 'emails']}
        chosen={['consensus->evm-config']}
        onChosen={(next) => chosen.push(next)}
      />,
    );
    expect(screen.getByText('One part starting work in another')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Analytics triggers Transactional Emails'));
    expect(chosen[0]).toEqual(['consensus->evm-config', 'analytics->emails']);
  });

  it('drops a pair when a person switches it off', () => {
    const chosen: string[][] = [];
    render(
      <Harness
        start={seeded()}
        changes={[]}
        moduleIds={['analytics', 'emails']}
        chosen={['analytics->emails', 'consensus->evm-config']}
        onChosen={(next) => chosen.push(next)}
      />,
    );
    const toggle = screen.getByLabelText('Analytics triggers Transactional Emails');
    expect(toggle).toBeChecked();
    fireEvent.click(toggle);
    expect(chosen[0]).toEqual(['consensus->evm-config']);
  });
});
