import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WorkflowEditor, { describeDeadline, workflowFixes } from './WorkflowEditor';
import { applyComposition, composeSections } from '@/lib/blueprint/compose';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { putWorkflow } from '@/lib/blueprint/edit';
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

function seeded(withWorkflow = false): Blueprint {
  const composed = applyComposition(readBlueprintDocument({}), composeSections(['wallet-auth']), []);
  return withWorkflow ? putWorkflow(composed, workflow) : composed;
}

describe('deadlines', () => {
  it('states a deadline in the unit a reader expects', () => {
    expect(describeDeadline(86400)).toBe('after 1.0 days');
    expect(describeDeadline(7200)).toBe('after 2.0 hours');
    expect(describeDeadline(300)).toBe('after 5 minutes');
    expect(describeDeadline(30)).toBe('after 30 seconds');
  });
});

describe('the corrections a workflow still needs', () => {
  it('reports nothing on a workflow that opens and ends', () => {
    expect(workflowFixes(workflow)).toEqual([]);
  });

  it('names a state nothing reaches', () => {
    const wider = {
      ...workflow,
      states: [...workflow.states, { id: 'held', name: 'Held', terminal: true }],
    };
    const held = workflowFixes(wider);
    expect(held[0].subject).toMatch(/Nothing reaches held/);
    expect(held[0].fix).toMatch(/Add a transition into held/);
  });

  it('names a state that strands a record', () => {
    const stranded = {
      ...workflow,
      states: [...workflow.states, { id: 'held', name: 'Held', terminal: false }],
      transitions: [
        ...workflow.transitions,
        { id: 'hold', from_state: 'requested', to_state: 'held' },
      ],
    };
    expect(workflowFixes(stranded).some((entry) => entry.subject.includes('stops in held'))).toBe(
      true,
    );
  });

  it('names a workflow that never ends', () => {
    const endless = {
      ...workflow,
      states: workflow.states.map((state) => ({ ...state, terminal: false })),
    };
    expect(workflowFixes(endless).some((entry) => entry.subject === 'This workflow never ends.')).toBe(
      true,
    );
  });
});

describe('the workflow editor', () => {
  it('states what a workflow gives a record', () => {
    render(<WorkflowEditor blueprint={seeded()} onChange={() => undefined} />);
    expect(screen.getByText('A workflow gives a record an order')).toBeInTheDocument();
  });

  it('adds a workflow with an opened state and a closed state', async () => {
    const changes: Blueprint[] = [];
    render(<WorkflowEditor blueprint={seeded()} onChange={(next) => changes.push(next)} />);
    await userEvent.type(screen.getByLabelText('What it governs'), 'Berth booking');
    await userEvent.click(screen.getByRole('button', { name: 'Add it' }));
    const added = changes[changes.length - 1].workflows[0];
    expect(added.id).toBe('berth_booking');
    expect(added.states.map((state) => state.id)).toEqual(['opened', 'closed']);
    expect(added.transitions).toHaveLength(1);
    expect(added.collection).toBe('user');
  });

  it('states when a record waits with no deadline', () => {
    render(<WorkflowEditor blueprint={seeded(true)} onChange={() => undefined} />);
    expect(
      screen.getByText('No deadline yet. A record waits in its state until somebody moves it.'),
    ).toBeInTheDocument();
  });

  it('removes a state with every way out that named it', async () => {
    const changes: Blueprint[] = [];
    render(<WorkflowEditor blueprint={seeded(true)} onChange={(next) => changes.push(next)} />);
    await userEvent.click(screen.getAllByTestId('CancelIcon')[0]);
    const next = changes[0].workflows[0];
    expect(next.states).toHaveLength(1);
    expect(next.transitions).toHaveLength(0);
  });
});
