import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { validateBlueprint } from '@/lib/blueprint/validate';
import type { Blueprint } from '@/lib/blueprint/types';
import BehaviorPanel from './step2-BehaviorPanel';
import WorkflowPanel from './step2-WorkflowPanel';
import { groupCollections } from './step2-model';
import { harbourRegister } from './step2-fixture';
import { emptyLogicLayout, type Drawing, type LogicLayout } from './step2-types';

// The two canvases draw with a browser layout engine the test runner lacks.
// Each stub keeps the contract: it receives the drawing or the workflow and
// hands a change back the way a drag on the real canvas would.
vi.mock('@/components/studio/logic/LogicCanvas', () => ({
  default: ({ drawing, onChangeDrawing, compiled }: { drawing: Drawing; onChangeDrawing: (next: Drawing) => void; compiled: { action?: { id: string } } }) => (
    <div data-testid="logic-canvas-stub">
      <span data-testid="drawing-blocks">{drawing.nodes.map((node) => node.blockId).join(',')}</span>
      <span data-testid="drawing-action">{compiled.action?.id ?? 'none'}</span>
      <button
        type="button"
        onClick={() =>
          onChangeDrawing({
            ...drawing,
            nodes: [...drawing.nodes, { id: 'n_add', blockId: 'db-create', position: { x: 300, y: 120 }, props: { collection: 'berth' } }],
            edges: [{ id: 'e1', source: drawing.nodes[0].id, sourcePort: 'next', target: 'n_add', targetPort: 'in' }],
          })
        }
      >
        Place Add a record
      </button>
    </div>
  ),
}));

vi.mock('@/components/studio/flow/WorkflowCanvas', () => ({
  default: ({
    workflow,
    onChangeWorkflow,
    onSelectState,
    onSelectTransition,
  }: {
    workflow: { states: { id: string }[]; transitions: { id: string }[] };
    onChangeWorkflow: (next: unknown) => void;
    onSelectState: (id: string | null) => void;
    onSelectTransition: (id: string | null) => void;
  }) => (
    <div data-testid="workflow-canvas-stub">
      <span data-testid="state-count">{workflow.states.length}</span>
      <button type="button" onClick={() => onSelectState(workflow.states[0].id)}>
        Select first state
      </button>
      <button type="button" onClick={() => onSelectTransition(workflow.transitions[0]?.id ?? null)}>
        Select first way out
      </button>
      <button
        type="button"
        onClick={() =>
          onChangeWorkflow({
            ...workflow,
            transitions: [...workflow.transitions, { id: 'move_2', from_state: workflow.states[1].id, to_state: workflow.states[0].id }],
          })
        }
      >
        Drag a way back
      </button>
    </div>
  ),
}));

function Harness({ start, children }: { start: Blueprint; children: (b: Blueprint, change: (n: Blueprint) => void, layout: LogicLayout, changeLayout: (fn: (held: LogicLayout) => LogicLayout) => void) => React.ReactNode }) {
  const [blueprint, setBlueprint] = useState(start);
  const [layout, setLayout] = useState<LogicLayout>(emptyLogicLayout());
  return <>{children(blueprint, setBlueprint, layout, (fn) => setLayout((held) => fn(held)))}</>;
}

describe('the Logic tab', () => {
  it('adds a rule with a formula and an action with its Access Manifest', async () => {
    const user = userEvent.setup();
    let latest: Blueprint = harbourRegister();
    render(
      <Harness start={latest}>
        {(blueprint, change, layout, changeLayout) => {
          latest = blueprint;
          return (
            <BehaviorPanel
              blueprint={blueprint}
              grouping={groupCollections(blueprint, [], {})}
              track="dapp"
              layout={layout}
              onChange={change}
              onChangeLayout={changeLayout}
            />
          );
        }}
      </Harness>,
    );
    await user.type(screen.getByLabelText('Add a rule'), 'Length above zero{Enter}');
    expect(latest.rules.map((rule) => rule.id)).toEqual(['length_above_zero']);

    await user.click(screen.getByLabelText('Collection of rule length_above_zero'));
    await user.click(await screen.findByRole('option', { name: 'Berth' }));
    expect(latest.rules[0].collections).toEqual(['berth']);
    const formula = screen.getByLabelText('The formula behind length above zero');
    fireEvent.change(formula, { target: { value: 'record.length > 0' } });
    expect(latest.rules[0].expression).toEqual({
      kind: 'Call',
      operator: 'greater_than',
      arguments: [
        { kind: 'Field', target: { kind: 'Param', name: 'record' }, field: 'length' },
        { kind: 'Literal', value: { kind: 'Integer', value: 0 } },
      ],
    });

    await user.type(screen.getByLabelText('Add an action'), 'Release a berth{Enter}');
    const action = latest.actions.find((entry) => entry.id === 'release_a_berth');
    expect(action?.effects[0]).toEqual(expect.objectContaining({ kind: 'Insert', collection: 'harbour' }));
    expect(screen.getByTestId('action-release_a_berth')).toHaveTextContent('writes harbour');
    expect(validateBlueprint(latest)).toEqual([]);
  });

  it('copies a recommended trigger into the Blueprint as an event and an action', async () => {
    const user = userEvent.setup();
    let latest: Blueprint = harbourRegister();
    render(
      <Harness start={latest}>
        {(blueprint, change, layout, changeLayout) => {
          latest = blueprint;
          return (
            <BehaviorPanel blueprint={blueprint} grouping={groupCollections(blueprint, [], {})} track="dapp" layout={layout} onChange={change} onChangeLayout={changeLayout} />
          );
        }}
      </Harness>,
    );
    await user.click(screen.getByRole('button', { name: 'Add the trigger Write the harbour to the audit trail' }));
    expect(latest.events.map((event) => event.id)).toEqual(['a_harbour_is_added', 'write_the_harbour_to_the_audit_trail_done']);
    const action = latest.actions.find((entry) => entry.id === 'write_the_harbour_to_the_audit_trail');
    expect(action?.effects.map((effect) => effect.kind)).toEqual(['Read', 'Emit']);
    expect(screen.getByRole('button', { name: 'Remove the trigger Write the harbour to the audit trail' })).toBeInTheDocument();
  });

  it('draws a flow in Visual mode and writes its action as the drawing grows', async () => {
    const user = userEvent.setup();
    let latest: Blueprint = harbourRegister();
    render(
      <Harness start={latest}>
        {(blueprint, change, layout, changeLayout) => {
          latest = blueprint;
          return (
            <BehaviorPanel blueprint={blueprint} grouping={groupCollections(blueprint, [], {})} track="dapp" layout={layout} onChange={change} onChangeLayout={changeLayout} />
          );
        }}
      </Harness>,
    );
    await user.click(screen.getByRole('tab', { name: 'Visual mode' }));
    await user.type(screen.getByLabelText('Name of the new flow'), 'Register a vessel{Enter}');
    expect(screen.getByTestId('drawing-blocks')).toHaveTextContent('start');
    expect(screen.getByTestId('drawing-action')).toHaveTextContent('none');
    await user.click(screen.getByRole('button', { name: 'Place Add a record' }));
    expect(screen.getByTestId('drawing-action')).toHaveTextContent('register_a_vessel');
    const action = latest.actions.find((entry) => entry.id === 'register_a_vessel');
    expect(action?.effects).toEqual([expect.objectContaining({ kind: 'Insert', collection: 'berth' })]);
    expect(action?.roles).toEqual(['clerk']);
    expect(validateBlueprint(latest)).toEqual([]);
  });
});

describe('the Workflows tab', () => {
  it('adds a two state workflow, edits a state and names the corrections', async () => {
    const user = userEvent.setup();
    let latest: Blueprint = harbourRegister();
    render(
      <Harness start={latest}>
        {(blueprint, change, layout, changeLayout) => {
          latest = blueprint;
          return <WorkflowPanel blueprint={blueprint} layout={layout} onChange={change} onChangeLayout={changeLayout} />;
        }}
      </Harness>,
    );
    await user.type(screen.getByLabelText('Name of the new workflow'), 'Berth life{Enter}');
    expect(latest.workflows[0]).toEqual(
      expect.objectContaining({ id: 'berth_life', collection: 'harbour', initial_state: 'opened' }),
    );
    expect(screen.getByTestId('state-count')).toHaveTextContent('2');
    expect(screen.queryByTestId('workflow-fixes')).toBeNull();

    await user.type(screen.getByLabelText('Name of the new state'), 'Under repair{Enter}');
    expect(latest.workflows[0].states.map((state) => state.id)).toEqual(['opened', 'closed', 'under_repair']);
    expect(screen.getByTestId('workflow-fixes')).toHaveTextContent('Nothing reaches under repair.');

    await user.click(screen.getByRole('button', { name: 'Select first state' }));
    fireEvent.change(screen.getByLabelText('State name'), { target: { value: 'Free' } });
    expect(latest.workflows[0].states[0].name).toBe('Free');

    await user.click(screen.getByRole('button', { name: 'Select first way out' }));
    await user.click(screen.getByLabelText('Action that moves the record'));
    await user.click(await screen.findByRole('option', { name: 'Allocate a berth' }));
    expect(latest.workflows[0].transitions[0].action).toBe('allocate_a_berth');
    expect(screen.getByTestId('transition-properties')).toHaveTextContent('Clerk');
    expect(validateBlueprint(latest)).toEqual([]);
  });
});
