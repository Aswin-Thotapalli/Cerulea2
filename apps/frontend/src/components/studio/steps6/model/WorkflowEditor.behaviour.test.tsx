import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import WorkflowEditor from './WorkflowEditor';
import { buildEffect } from './LogicEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { putAction, putWorkflow } from '@/lib/blueprint/edit';
import type { Blueprint, Workflow } from '@/lib/blueprint/types';

const workflow: Workflow = {
  id: 'berth_booking',
  name: 'Berth booking',
  collection: 'user',
  state_field: 'status',
  initial_state: 'requested',
  states: [
    { id: 'requested', name: 'Requested', terminal: false },
    { id: 'closed', name: 'Closed', terminal: true },
  ],
  transitions: [{ id: 'close', from_state: 'requested', to_state: 'closed' }],
  timers: [],
};

function seeded(): Blueprint {
  return applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
}

function withWorkflow(held: Workflow = workflow, withAction = false): Blueprint {
  const base = putWorkflow(seeded(), held);
  if (!withAction) return base;
  return putAction(base, {
    id: 'approve',
    name: 'Approve the booking',
    params: [],
    preconditions: [],
    effects: [buildEffect('Update', 'user')],
    emits: [],
    class: 'Routine',
    roles: ['owner'],
    description: 'Approve the booking records the work in user.',
  });
}

/** Holds the Blueprint in state so the editor redraws after each change. */
function Harness({ start, changes }: { start: Blueprint; changes: Blueprint[] }) {
  const [blueprint, setBlueprint] = useState(start);
  return (
    <WorkflowEditor
      blueprint={blueprint}
      onChange={(next) => {
        changes.push(next);
        setBlueprint(next);
      }}
    />
  );
}

async function pick(name: RegExp, option: string | RegExp) {
  fireEvent.mouseDown(screen.getByRole('combobox', { name }));
  const listbox = await screen.findByRole('listbox');
  fireEvent.click(within(listbox).getByRole('option', { name: option }));
  await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
}

function heldWorkflow(changes: Blueprint[]): Workflow {
  return changes[changes.length - 1].workflows[0];
}

describe('the workflow editor over a held workflow', { timeout: 30000 }, () => {
  it('shows the states, the field that holds them and the ways out', () => {
    render(<Harness start={withWorkflow()} changes={[]} />);
    expect(screen.getByLabelText('Workflow')).toHaveValue('Berth booking');
    expect(screen.getByText('The state sits in the status field.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Requested' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Closed (end)' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'From state of close' })).toHaveTextContent(
      'Requested',
    );
    expect(screen.getByRole('combobox', { name: 'To state of close' })).toHaveTextContent('Closed');
    expect(screen.queryByText('This workflow never ends.')).not.toBeInTheDocument();
  });

  it('renames the workflow', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('Workflow'), { target: { value: 'Berth request' } });
    expect(heldWorkflow(changes).name).toBe('Berth request');
    expect(heldWorkflow(changes).id).toBe('berth_booking');
  });

  it('moves the workflow to another collection and finds the field that holds the state', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    await pick(/^Records it moves/, 'Session');
    expect(heldWorkflow(changes).collection).toBe('session');
    expect(heldWorkflow(changes).state_field).toBe('id');
    expect(screen.getByText('The state sits in the id field.')).toBeInTheDocument();
  });

  it('starts records in another state and reports the state nothing reaches', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    await pick(/^Starts in/, 'Closed');
    expect(heldWorkflow(changes).initial_state).toBe('closed');
    expect(screen.getByText('Nothing reaches requested.')).toBeInTheDocument();
    expect(
      screen.getByText('Add a transition into requested, or remove the state.'),
    ).toBeInTheDocument();
  });

  it('marks a state as an end when a person taps it', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Requested' }));
    expect(heldWorkflow(changes).states.find((state) => state.id === 'requested')?.terminal).toBe(
      true,
    );
    expect(screen.getByRole('button', { name: 'Requested (end)' })).toBeInTheDocument();
  });

  it('unmarks an end and reports a workflow that never ends', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Closed (end)' }));
    expect(heldWorkflow(changes).states.every((state) => state.terminal === false)).toBe(true);
    expect(screen.getByText('This workflow never ends.')).toBeInTheDocument();
    expect(screen.getByText('A record stops in closed and never moves on.')).toBeInTheDocument();
  });

  it('adds a named state and reports that it strands a record', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    const field = screen.getByLabelText('Add a state');
    fireEvent.change(field, { target: { value: 'On hold' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Add it' })[0]);
    expect(heldWorkflow(changes).states).toContainEqual({
      id: 'on_hold',
      name: 'On hold',
      terminal: false,
    });
    expect(field).toHaveValue('');
    expect(screen.getByText('Nothing reaches on hold.')).toBeInTheDocument();
    expect(screen.getByText('A record stops in on hold and never moves on.')).toBeInTheDocument();
  });

  it('holds the add state button shut until the name has two letters', () => {
    render(<Harness start={withWorkflow()} changes={[]} />);
    fireEvent.change(screen.getByLabelText('Add a state'), { target: { value: 'H' } });
    expect(screen.getAllByRole('button', { name: 'Add it' })[0]).toBeDisabled();
  });

  it('points a way out at another starting state', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    await pick(/^From state of close/, 'Closed');
    expect(heldWorkflow(changes).transitions[0]).toEqual({
      id: 'close',
      from_state: 'closed',
      to_state: 'closed',
    });
  });

  it('points a way out at another ending state', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    await pick(/^To state of close/, 'Requested');
    expect(heldWorkflow(changes).transitions[0].to_state).toBe('requested');
    expect(screen.getByText('Nothing reaches closed.')).toBeInTheDocument();
  });

  it('names the action that moves a record and clears it again', async () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow(workflow, true)} changes={changes} />);
    await pick(/^Action of close/, 'Approve the booking');
    expect(heldWorkflow(changes).transitions[0].action).toBe('approve');
    await pick(/^Action of close/, 'Anyone permitted may move it');
    expect(heldWorkflow(changes).transitions[0].action).toBeUndefined();
  });

  it('removes a way out and reports the stranded states', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove the way from requested to closed' }));
    expect(heldWorkflow(changes).transitions).toEqual([]);
    expect(screen.getByText('Nothing reaches closed.')).toBeInTheDocument();
    expect(
      screen.getByText('A record stops in requested and never moves on.'),
    ).toBeInTheDocument();
  });

  it('adds a way out from the starting state to the last state', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a way out' }));
    expect(heldWorkflow(changes).transitions[1]).toEqual({
      id: 'move_2',
      from_state: 'requested',
      to_state: 'closed',
    });
    expect(screen.getByRole('combobox', { name: 'From state of move_2' })).toBeInTheDocument();
  });

  it('holds the deadline button shut while no action exists', () => {
    render(<Harness start={withWorkflow()} changes={[]} />);
    expect(screen.getByRole('button', { name: 'Add a deadline' })).toBeDisabled();
  });

  it('adds a deadline that runs the first action after one day', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow(workflow, true)} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add a deadline' }));
    expect(heldWorkflow(changes).timers).toEqual([
      { id: 'deadline_1', state: 'requested', after_seconds: 86400, action: 'approve' },
    ]);
    expect(
      screen.getByText('A record waiting in requested runs Approve the booking after 1.0 days.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('No deadline yet. A record waits in its state until somebody moves it.'),
    ).not.toBeInTheDocument();
  });

  it('names a deadline action by its key when no action carries that key', () => {
    const timed = {
      ...workflow,
      timers: [{ id: 'deadline_1', state: 'requested', after_seconds: 7200, action: 'expire' }],
    };
    render(<Harness start={withWorkflow(timed)} changes={[]} />);
    expect(
      screen.getByText('A record waiting in requested runs expire after 2.0 hours.'),
    ).toBeInTheDocument();
  });

  it('removes the workflow from the Blueprint', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove this workflow' }));
    expect(changes[changes.length - 1].workflows).toEqual([]);
    expect(screen.queryByLabelText('Workflow')).not.toBeInTheDocument();
  });

  it('refuses a second workflow that carries the same name', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={withWorkflow()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What it governs'), {
      target: { value: 'Berth booking' },
    });
    const buttons = screen.getAllByRole('button', { name: 'Add it' });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(changes).toHaveLength(0);
    expect(screen.getByLabelText('What it governs')).toHaveValue('Berth booking');
  });

  it('adds a workflow that keeps its state in the status field', () => {
    const changes: Blueprint[] = [];
    render(<Harness start={seeded()} changes={changes} />);
    fireEvent.change(screen.getByLabelText('What it governs'), { target: { value: 'Onboarding' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add it' }));
    const added = heldWorkflow(changes);
    expect(added.state_field).toBe('status');
    expect(added.initial_state).toBe('opened');
    expect(screen.getByLabelText('What it governs')).toHaveValue('');
    expect(screen.getByLabelText('Workflow')).toHaveValue('Onboarding');
  });
});

describe('the workflow editor over an empty model', { timeout: 30000 }, () => {
  it('asks for a collection first and holds the add button shut', () => {
    render(<Harness start={readBlueprintDocument({})} changes={[]} />);
    expect(
      screen.getByText(/No collection yet\. Open the Records surface and add what the system keeps/),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('What it governs'), { target: { value: 'Onboarding' } });
    expect(screen.getByRole('button', { name: 'Add it' })).toBeDisabled();
  });
});
