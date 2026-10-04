'use client';

// apps/frontend/src/components/studio/steps/step2-WorkflowPanel.tsx
// The Workflows tab of the Data schema step.
// A workflow moves one record through named states. The tab lists the
// workflows of the Blueprint, draws the chosen one on the workflow canvas and
// edits the selected state or way out beside it: the name, the end mark, the
// starting state, the action that moves the record, the condition that holds
// the way shut, the approvals a move needs and the deadlines that move a
// record on by themselves. Every change writes the Workflows section. The
// corrections a workflow still needs are named above the canvas.
// Without a workflow a record has no order to its life.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import ControlMirror from '@/components/studio/common/ControlMirror';
import FormulaBar from '@/components/studio/common/FormulaBar';
import WorkflowCanvas from '@/components/studio/flow/WorkflowCanvas';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  addWorkflowState,
  deadEndStates,
  putTimer,
  putTransition,
  putWorkflow,
  recordTypeOf,
  removeWorkflow,
  removeWorkflowState,
  unreachableStates,
} from '@/lib/blueprint/edit';
import { readAndCheck, scopeForCollection, writeFormula } from '@/lib/blueprint/formula';
import type { Blueprint, Workflow } from '@/lib/blueprint/types';
import type { LogicLayout, Point } from './step2-types';

/** Turns a deadline in seconds into the phrase a person reads. */
export function describeDeadline(seconds: number): string {
  if (seconds >= 86400) return `after ${(seconds / 86400).toFixed(1)} days`;
  if (seconds >= 3600) return `after ${(seconds / 3600).toFixed(1)} hours`;
  if (seconds >= 60) return `after ${Math.round(seconds / 60)} minutes`;
  return `after ${seconds} seconds`;
}

/** Names every correction a workflow still needs. */
export function workflowFixes(workflow: Workflow): { subject: string; fix: string }[] {
  const held: { subject: string; fix: string }[] = [];
  for (const stateId of unreachableStates(workflow)) {
    held.push({
      subject: `Nothing reaches ${toReadable(stateId).toLowerCase()}.`,
      fix: `Add a way into ${toReadable(stateId).toLowerCase()}, or remove the state.`,
    });
  }
  for (const stateId of deadEndStates(workflow)) {
    held.push({
      subject: `A record stops in ${toReadable(stateId).toLowerCase()} and never moves on.`,
      fix: `Add a way out of ${toReadable(stateId).toLowerCase()}, or mark the state as an end.`,
    });
  }
  if (workflow.states.some((state) => state.terminal) === false) {
    held.push({ subject: 'This workflow never ends.', fix: 'Mark the state that closes the work as an end.' });
  }
  return held;
}

/**
 * Reads the approvals a way out needs from the roles of the action that moves it.
 * An approval is a role that must run the action, so the Blueprint keeps it as
 * the roles of that action.
 */
export function approvalsOf(blueprint: Blueprint, workflow: Workflow, transitionId: string): string[] {
  const transition = workflow.transitions.find((entry) => entry.id === transitionId);
  const action = blueprint.actions.find((entry) => entry.id === transition?.action);
  return action?.roles ?? [];
}

export type WorkflowPanelProps = {
  blueprint: Blueprint;
  layout: LogicLayout;
  onChange: (next: Blueprint) => void;
  onChangeLayout: (next: (held: LogicLayout) => LogicLayout) => void;
};

export default function WorkflowPanel({ blueprint, layout, onChange, onChangeLayout }: WorkflowPanelProps) {
  const theme = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newState, setNewState] = useState('');

  const workflow = blueprint.workflows.find((entry) => entry.id === selectedId) ?? blueprint.workflows[0] ?? null;
  const fixes = useMemo(() => (workflow ? workflowFixes(workflow) : []), [workflow]);
  const positions = (workflow && layout.workflowPositions[workflow.id]) ?? {};

  const stateFieldOf = (collectionId: string): string => {
    const collection = blueprint.collections.find((entry) => entry.id === collectionId);
    const record = collection ? recordTypeOf(blueprint, collection) : null;
    const named = (record?.fields ?? []).find((field) => field.name.includes('status') || field.name.includes('state'));
    return named?.name ?? record?.fields[0]?.name ?? 'status';
  };

  const addWorkflow = () => {
    const id = toIdentifier(newName);
    const collection = blueprint.collections[0];
    if (id.length === 0 || !collection || blueprint.workflows.some((entry) => entry.id === id)) return;
    onChange(
      putWorkflow(blueprint, {
        id,
        name: newName.trim(),
        collection: collection.id,
        state_field: stateFieldOf(collection.id),
        initial_state: 'opened',
        states: [
          { id: 'opened', name: 'Opened', terminal: false },
          { id: 'closed', name: 'Closed', terminal: true },
        ],
        transitions: [{ id: 'close', from_state: 'opened', to_state: 'closed' }],
        timers: [],
      }),
    );
    setSelectedId(id);
    setNewName('');
  };

  const change = (next: Workflow) => onChange(putWorkflow(blueprint, next));

  const changePositions = (next: Record<string, Point>) => {
    if (!workflow) return;
    onChangeLayout((held) => ({
      ...held,
      workflowPositions: { ...held.workflowPositions, [workflow.id]: next },
    }));
  };

  const state = workflow?.states.find((entry) => entry.id === selectedState) ?? null;
  const transition = workflow?.transitions.find((entry) => entry.id === selectedTransition) ?? null;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }} data-testid="workflow-panel">
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', flexShrink: 0 }}
      >
        <Typography variant="h6" fontWeight={800} sx={{ mr: 1 }}>
          Workflows
        </Typography>
        {blueprint.workflows.map((entry) => (
          <Chip
            key={entry.id}
            label={entry.name}
            color={workflow?.id === entry.id ? 'primary' : 'default'}
            onClick={() => {
              setSelectedId(entry.id);
              setSelectedState(null);
              setSelectedTransition(null);
            }}
            onDelete={() => {
              onChange(removeWorkflow(blueprint, entry.id));
              setSelectedId(null);
            }}
            aria-label={`Workflow ${entry.name}`}
          />
        ))}
        <TextField
          size="small"
          label="New workflow"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addWorkflow();
          }}
          inputProps={{ 'aria-label': 'Name of the new workflow' }}
          sx={{ minWidth: 220 }}
        />
        <Button variant="outlined" size="small" onClick={addWorkflow} disabled={newName.trim().length < 2 || blueprint.collections.length === 0}>
          Add it
        </Button>
        <Typography variant="caption" color="text.secondary">
          Cerulea opens a new workflow with an opened state and a closed state, joined by one way out.
        </Typography>
      </Stack>

      {!workflow ? (
        <Box sx={{ p: 4 }}>
          <Alert severity="info">
            <AlertTitle>A workflow gives a record an order</AlertTitle>
            A record sits in one state at a time. A way out names the action that moves it. A condition
            holds the way shut until it holds. A deadline moves a record on by itself.
            {blueprint.collections.length === 0 && ' Add a collection on the Data Model tab first.'}
          </Alert>
        </Box>
      ) : (
        <Stack direction="row" sx={{ flex: 1, minHeight: 0 }}>
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <TextField
                size="small"
                label="Workflow"
                value={workflow.name}
                onChange={(event) => change({ ...workflow, name: event.target.value })}
                inputProps={{ 'aria-label': 'Workflow name' }}
                sx={{ minWidth: 200 }}
              />
              <Box sx={{ minWidth: 220 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Records it moves"
                  value={workflow.collection}
                  onChange={(event) =>
                    change({ ...workflow, collection: event.target.value, state_field: stateFieldOf(event.target.value) })
                  }
                  helperText={`The state sits in the ${toReadable(workflow.state_field).toLowerCase()} field.`}
                  inputProps={{ 'aria-label': 'Collection the workflow moves' }}
                >
                  {blueprint.collections.map((entry) => (
                    <MenuItem key={entry.id} value={entry.id}>
                      {toReadable(entry.id)}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Box sx={{ minWidth: 200 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Starts in"
                  value={workflow.initial_state}
                  onChange={(event) => change({ ...workflow, initial_state: event.target.value })}
                  helperText="Every new record opens in this state."
                  inputProps={{ 'aria-label': 'Starting state' }}
                >
                  {workflow.states.map((entry) => (
                    <MenuItem key={entry.id} value={entry.id}>
                      {entry.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box>
                  <TextField
                    size="small"
                    label="Add a state"
                    value={newState}
                    onChange={(event) => setNewState(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && newState.trim().length >= 2) {
                        change(addWorkflowState(workflow, { id: toIdentifier(newState), name: newState.trim(), terminal: false }));
                        setNewState('');
                      }
                    }}
                    inputProps={{ 'aria-label': 'Name of the new state' }}
                    sx={{ minWidth: 180 }}
                  />
                  <ControlMirror controlId="blueprint.workflow_state" dense />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={newState.trim().length < 2}
                  onClick={() => {
                    change(addWorkflowState(workflow, { id: toIdentifier(newState), name: newState.trim(), terminal: false }));
                    setNewState('');
                  }}
                >
                  Add it
                </Button>
              </Stack>
            </Stack>

            {fixes.length > 0 && (
              <Stack direction="row" spacing={1} sx={{ px: 3, py: 1 }} flexWrap="wrap" useFlexGap data-testid="workflow-fixes">
                {fixes.map((entry) => (
                  <Alert key={entry.subject} severity="warning" sx={{ py: 0 }}>
                    <b>{entry.subject}</b> {entry.fix}
                  </Alert>
                ))}
              </Stack>
            )}

            <Box sx={{ flex: 1, minHeight: 420 }}>
              <WorkflowCanvas
                workflow={workflow}
                actions={blueprint.actions}
                positions={positions}
                unreachable={unreachableStates(workflow)}
                deadEnds={deadEndStates(workflow)}
                selectedStateId={selectedState}
                selectedTransitionId={selectedTransition}
                onChangeWorkflow={change}
                onChangePositions={changePositions}
                onSelectState={setSelectedState}
                onSelectTransition={setSelectedTransition}
              />
            </Box>
          </Box>

          <Box sx={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper', overflowY: 'auto', p: 2 }}>
            {state && (
              <Stack spacing={2} data-testid="state-properties">
                <Typography variant="subtitle2" fontWeight={800}>
                  State
                </Typography>
                <TextField
                  size="small"
                  label="Name"
                  value={state.name}
                  onChange={(event) => change(addWorkflowState(workflow, { ...state, name: event.target.value }))}
                  inputProps={{ 'aria-label': 'State name' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={state.terminal}
                      onChange={(event) => change(addWorkflowState(workflow, { ...state, terminal: event.target.checked }))}
                      slotProps={{ input: { 'aria-label': 'This state ends the work' } }}
                    />
                  }
                  label="This state ends the work"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflow.initial_state === state.id}
                      onChange={(event) => {
                        if (event.target.checked) change({ ...workflow, initial_state: state.id });
                      }}
                      slotProps={{ input: { 'aria-label': 'Every new record starts here' } }}
                    />
                  }
                  label="Every new record starts here"
                />
                <ControlMirror controlId="blueprint.workflow_state" dense />
                <Divider />
                <Typography variant="subtitle2" fontWeight={800}>
                  Deadlines in this state
                </Typography>
                {workflow.timers
                  .filter((timer) => timer.state === state.id)
                  .map((timer) => (
                    <Paper key={timer.id} variant="outlined" sx={{ p: 1.5 }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        label="Action it runs"
                        value={timer.action}
                        onChange={(event) => change(putTimer(workflow, { ...timer, action: event.target.value }))}
                        inputProps={{ 'aria-label': `Action of deadline ${timer.id}` }}
                        sx={{ mb: 1 }}
                      >
                        {blueprint.actions.map((action) => (
                          <MenuItem key={action.id} value={action.id}>
                            {action.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        label="After (hours)"
                        value={Math.round(timer.after_seconds / 3600)}
                        onChange={(event) => {
                          const hours = Number(event.target.value);
                          if (Number.isFinite(hours) && hours >= 1) {
                            change(putTimer(workflow, { ...timer, after_seconds: Math.round(hours * 3600) }));
                          }
                        }}
                        inputProps={{ min: 1, 'aria-label': `Hours of deadline ${timer.id}` }}
                        helperText={`A record waiting here runs the action ${describeDeadline(timer.after_seconds)}.`}
                      />
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteOutlineIcon />}
                        onClick={() => change({ ...workflow, timers: workflow.timers.filter((entry) => entry.id !== timer.id) })}
                      >
                        Remove the deadline
                      </Button>
                    </Paper>
                  ))}
                <Button
                  size="small"
                  variant="outlined"
                  disabled={blueprint.actions.length === 0}
                  onClick={() =>
                    change(
                      putTimer(workflow, {
                        id: `deadline_${workflow.timers.length + 1}`,
                        state: state.id,
                        after_seconds: 86400,
                        action: blueprint.actions[0]?.id ?? '',
                      }),
                    )
                  }
                >
                  Add a deadline
                </Button>
                {blueprint.actions.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    A deadline runs an action. Add one on the Logic tab first.
                  </Typography>
                )}
                <ControlMirror controlId="blueprint.workflow_timer" dense />
                <Divider />
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={workflow.states.length <= 1}
                  onClick={() => {
                    change(removeWorkflowState(workflow, state.id));
                    setSelectedState(null);
                  }}
                >
                  Remove this state
                </Button>
              </Stack>
            )}

            {transition && (
              <TransitionProperties
                blueprint={blueprint}
                workflow={workflow}
                transitionId={transition.id}
                onChange={change}
                onRemoved={() => setSelectedTransition(null)}
              />
            )}

            {!state && !transition && (
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={800}>
                  {workflow.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {workflow.states.length} states and {workflow.transitions.length} ways out. Click a
                  state or an arrow on the canvas to edit it.
                </Typography>
                {workflow.timers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No deadline yet. A record waits in its state until somebody moves it.
                  </Typography>
                ) : (
                  workflow.timers.map((timer) => (
                    <Typography key={timer.id} variant="body2">
                      A record waiting in {toReadable(timer.state).toLowerCase()} runs{' '}
                      {blueprint.actions.find((action) => action.id === timer.action)?.name ?? timer.action}{' '}
                      {describeDeadline(timer.after_seconds)}.
                    </Typography>
                  ))
                )}
                <ControlMirror controlId="blueprint.workflow_transition" dense />
              </Stack>
            )}
          </Box>
        </Stack>
      )}
    </Box>
  );
}

function TransitionProperties({
  blueprint,
  workflow,
  transitionId,
  onChange,
  onRemoved,
}: {
  blueprint: Blueprint;
  workflow: Workflow;
  transitionId: string;
  onChange: (next: Workflow) => void;
  onRemoved: () => void;
}) {
  const transition = workflow.transitions.find((entry) => entry.id === transitionId);
  const scope = useMemo(() => scopeForCollection(blueprint, workflow.collection), [blueprint, workflow.collection]);
  const [guard, setGuard] = useState(() => (transition?.guard ? writeFormula(transition.guard) : ''));
  if (!transition) return null;
  const approvals = approvalsOf(blueprint, workflow, transition.id);
  return (
    <Stack spacing={2} data-testid="transition-properties">
      <Typography variant="subtitle2" fontWeight={800}>
        Way out
      </Typography>
      <Typography variant="body2" color="text.secondary">
        From {workflow.states.find((entry) => entry.id === transition.from_state)?.name} to{' '}
        {workflow.states.find((entry) => entry.id === transition.to_state)?.name}.
      </Typography>
      <TextField
        select
        size="small"
        fullWidth
        label="Action that moves it"
        value={transition.action ?? ''}
        onChange={(event) => onChange(putTransition(workflow, { ...transition, action: event.target.value || undefined }))}
        helperText="The roles of that action are the approvals this move needs."
        inputProps={{ 'aria-label': 'Action that moves the record' }}
      >
        <MenuItem value="">Anyone permitted may move it</MenuItem>
        {blueprint.actions.map((action) => (
          <MenuItem key={action.id} value={action.id}>
            {action.name}
          </MenuItem>
        ))}
      </TextField>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Approvals
        </Typography>
        {approvals.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No approval. Any role with Update on the collection may move it.
          </Typography>
        ) : (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {approvals.map((roleId) => (
              <Chip key={roleId} size="small" label={blueprint.identities.roles.find((role) => role.id === roleId)?.name ?? roleId} />
            ))}
          </Stack>
        )}
      </Box>
      <FormulaBar
        label="Condition that holds the way shut"
        plain="The record moves only while this formula holds. Leave it empty for a way that is always open."
        scope={scope}
        value={guard}
        onChange={(next) => {
          setGuard(next);
          if (next.trim().length === 0) {
            onChange(putTransition(workflow, { ...transition, guard: undefined }));
            return;
          }
          const reading = readAndCheck(next, scope);
          if (reading.expression && reading.fault === undefined) {
            onChange(putTransition(workflow, { ...transition, guard: reading.expression }));
          }
        }}
      />
      <ControlMirror controlId="blueprint.workflow_transition" dense />
      <Button
        size="small"
        color="error"
        startIcon={<DeleteOutlineIcon />}
        onClick={() => {
          onChange({ ...workflow, transitions: workflow.transitions.filter((entry) => entry.id !== transition.id) });
          onRemoved();
        }}
      >
        Remove this way out
      </Button>
    </Stack>
  );
}
