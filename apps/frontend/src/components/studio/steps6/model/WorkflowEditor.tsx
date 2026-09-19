'use client';

// apps/frontend/src/components/studio/steps6/model/WorkflowEditor.tsx
// Step 3 Model, workflows.
// A workflow moves one record through named states. A transition names the way
// out of a state, and a guard holds the way shut until a condition holds. A
// timer moves a record on by itself once a deadline passes.
// The editor writes the Blueprint Workflows section, and reports a state that
// nothing reaches and a state that strands a record.
// Without a workflow a record has no order to its life.

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

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
import type { Blueprint, Workflow } from '@/lib/blueprint/types';

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
      fix: `Add a transition into ${toReadable(stateId).toLowerCase()}, or remove the state.`,
    });
  }
  for (const stateId of deadEndStates(workflow)) {
    held.push({
      subject: `A record stops in ${toReadable(stateId).toLowerCase()} and never moves on.`,
      fix: `Add a way out of ${toReadable(stateId).toLowerCase()}, or mark the state as an end.`,
    });
  }
  if (workflow.states.some((state) => state.terminal) === false) {
    held.push({
      subject: 'This workflow never ends.',
      fix: 'Mark the state that closes the work as an end.',
    });
  }
  return held;
}

export default function WorkflowEditor({
  blueprint,
  onChange,
}: {
  blueprint: Blueprint;
  onChange: (next: Blueprint) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newState, setNewState] = useState<Record<string, string>>({});

  const collections = blueprint.collections;

  const stateFieldOf = useMemo(
    () => (collectionId: string) => {
      const collection = collections.find((entry) => entry.id === collectionId);
      if (!collection) return 'status';
      const record = recordTypeOf(blueprint, collection);
      const named = (record?.fields ?? []).find((field) => field.name.includes('status'));
      return named?.name ?? (record?.fields[0]?.name ?? 'status');
    },
    [blueprint, collections],
  );

  const addWorkflow = () => {
    const id = toIdentifier(newName);
    const collection = collections[0];
    if (id.length === 0 || !collection || blueprint.workflows.some((entry) => entry.id === id)) {
      return;
    }
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
    setNewName('');
  };

  return (
    <Stack spacing={3}>
      <Alert severity="info" variant="outlined">
        <AlertTitle>A workflow gives a record an order</AlertTitle>
        A record sits in one state at a time. A transition names the way out. A guard holds the way
        shut until a condition holds. A timer moves a record on by itself once a deadline passes.
      </Alert>

      {collections.length === 0 && (
        <Alert severity="info">
          No collection yet. Open the Records surface and add what the system keeps, then give it a
          workflow.
        </Alert>
      )}

      {blueprint.workflows.map((workflow) => {
        const fixes = workflowFixes(workflow);
        return (
          <Paper key={workflow.id} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="Workflow"
                value={workflow.name}
                onChange={(event) =>
                  onChange(putWorkflow(blueprint, { ...workflow, name: event.target.value }))
                }
                fullWidth
              />
              <TextField
                select
                size="small"
                label="Records it moves"
                value={workflow.collection}
                onChange={(event) =>
                  onChange(
                    putWorkflow(blueprint, {
                      ...workflow,
                      collection: event.target.value,
                      state_field: stateFieldOf(event.target.value),
                    }),
                  )
                }
                sx={{ minWidth: 220 }}
                helperText={`The state sits in the ${toReadable(workflow.state_field).toLowerCase()} field.`}
              >
                {collections.map((entry) => (
                  <MenuItem key={entry.id} value={entry.id}>
                    {toReadable(entry.id)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Starts in"
                value={workflow.initial_state}
                onChange={(event) =>
                  onChange(
                    putWorkflow(blueprint, { ...workflow, initial_state: event.target.value }),
                  )
                }
                sx={{ minWidth: 200 }}
                helperText="Every new record opens in this state."
              >
                {workflow.states.map((state) => (
                  <MenuItem key={state.id} value={state.id}>
                    {state.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            {fixes.length > 0 && (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {fixes.map((entry) => (
                  <Alert key={entry.subject} severity="warning">
                    <AlertTitle>{entry.subject}</AlertTitle>
                    {entry.fix}
                  </Alert>
                ))}
              </Stack>
            )}

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              States
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {workflow.states.map((state) => (
                <Chip
                  key={state.id}
                  label={state.terminal ? `${state.name} (end)` : state.name}
                  color={state.id === workflow.initial_state ? 'primary' : 'default'}
                  onClick={() =>
                    onChange(
                      putWorkflow(
                        blueprint,
                        addWorkflowState(workflow, { ...state, terminal: state.terminal === false }),
                      ),
                    )
                  }
                  onDelete={
                    workflow.states.length > 1
                      ? () =>
                          onChange(
                            putWorkflow(blueprint, removeWorkflowState(workflow, state.id)),
                          )
                      : undefined
                  }
                />
              ))}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <TextField
                size="small"
                label="Add a state"
                value={newState[workflow.id] ?? ''}
                onChange={(event) =>
                  setNewState((previous) => ({ ...previous, [workflow.id]: event.target.value }))
                }
                helperText="Tap a state to mark it as an end, or to unmark it."
                sx={{ minWidth: 240 }}
              />
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={(newState[workflow.id] ?? '').trim().length < 2}
                  onClick={() => {
                    const name = (newState[workflow.id] ?? '').trim();
                    onChange(
                      putWorkflow(
                        blueprint,
                        addWorkflowState(workflow, {
                          id: toIdentifier(name),
                          name,
                          terminal: false,
                        }),
                      ),
                    );
                    setNewState((previous) => ({ ...previous, [workflow.id]: '' }));
                  }}
                >
                  Add it
                </Button>
              </Box>
            </Stack>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ways out of a state
            </Typography>
            <Table size="small" sx={{ mb: 2 }}>
              <TableHead>
                <TableRow>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Action that moves it</TableCell>
                  <TableCell align="right">Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workflow.transitions.map((transition) => (
                  <TableRow key={transition.id}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={transition.from_state}
                        onChange={(event) =>
                          onChange(
                            putWorkflow(
                              blueprint,
                              putTransition(workflow, {
                                ...transition,
                                from_state: event.target.value,
                              }),
                            ),
                          )
                        }
                        inputProps={{ 'aria-label': `From state of ${transition.id}` }}
                      >
                        {workflow.states.map((state) => (
                          <MenuItem key={state.id} value={state.id}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={transition.to_state}
                        onChange={(event) =>
                          onChange(
                            putWorkflow(
                              blueprint,
                              putTransition(workflow, {
                                ...transition,
                                to_state: event.target.value,
                              }),
                            ),
                          )
                        }
                        inputProps={{ 'aria-label': `To state of ${transition.id}` }}
                      >
                        {workflow.states.map((state) => (
                          <MenuItem key={state.id} value={state.id}>
                            {state.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        value={transition.action ?? ''}
                        onChange={(event) =>
                          onChange(
                            putWorkflow(
                              blueprint,
                              putTransition(workflow, {
                                ...transition,
                                action: event.target.value || undefined,
                              }),
                            ),
                          )
                        }
                        sx={{ minWidth: 200 }}
                        inputProps={{ 'aria-label': `Action of ${transition.id}` }}
                      >
                        <MenuItem value="">Anyone permitted may move it</MenuItem>
                        {blueprint.actions.map((action) => (
                          <MenuItem key={action.id} value={action.id}>
                            {action.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Remove the way from ${transition.from_state} to ${transition.to_state}`}
                        onClick={() =>
                          onChange(
                            putWorkflow(blueprint, {
                              ...workflow,
                              transitions: workflow.transitions.filter(
                                (entry) => entry.id !== transition.id,
                              ),
                            }),
                          )
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              size="small"
              onClick={() =>
                onChange(
                  putWorkflow(
                    blueprint,
                    putTransition(workflow, {
                      id: `move_${workflow.transitions.length + 1}`,
                      from_state: workflow.initial_state,
                      to_state: workflow.states[workflow.states.length - 1]?.id ?? workflow.initial_state,
                    }),
                  ),
                )
              }
              sx={{ mb: 3 }}
            >
              Add a way out
            </Button>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Deadlines
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              A deadline moves a record on by itself. Nobody has to remember.
            </Typography>
            <Stack spacing={1} sx={{ mb: 2 }}>
              {workflow.timers.map((timer) => (
                <Typography key={timer.id} variant="body2">
                  A record waiting in {toReadable(timer.state).toLowerCase()} runs{' '}
                  {blueprint.actions.find((action) => action.id === timer.action)?.name ??
                    timer.action}{' '}
                  {describeDeadline(timer.after_seconds)}.
                </Typography>
              ))}
              {workflow.timers.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No deadline yet. A record waits in its state until somebody moves it.
                </Typography>
              )}
            </Stack>
            <Button
              size="small"
              disabled={blueprint.actions.length === 0}
              onClick={() =>
                onChange(
                  putWorkflow(
                    blueprint,
                    putTimer(workflow, {
                      id: `deadline_${workflow.timers.length + 1}`,
                      state: workflow.initial_state,
                      after_seconds: 86400,
                      action: blueprint.actions[0]?.id ?? '',
                    }),
                  ),
                )
              }
            >
              Add a deadline
            </Button>

            <Box sx={{ mt: 2 }}>
              <Button
                size="small"
                color="error"
                onClick={() => onChange(removeWorkflow(blueprint, workflow.id))}
              >
                Remove this workflow
              </Button>
            </Box>
          </Paper>
        );
      })}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add a workflow
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            label="What it governs"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            helperText="Cerulea opens it with an opened state and a closed state, joined by one way out."
            sx={{ minWidth: 300 }}
          />
          <Box>
            <Button
              variant="outlined"
              onClick={addWorkflow}
              disabled={newName.trim().length < 2 || collections.length === 0}
            >
              Add it
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Stack>
  );
}
