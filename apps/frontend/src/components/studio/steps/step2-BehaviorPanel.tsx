'use client';

// apps/frontend/src/components/studio/steps/step2-BehaviorPanel.tsx
// The Logic tab of the Data schema step.
// Two modes, as production offered: Rules and Visual. Rules lists the rules
// and the actions of the Blueprint with the formula bar beside each rule and
// the Access Manifest beside each action, then the triggers Cerulea recommends
// per module, each one copying into the Blueprint as typed entries. Visual
// mounts the logic canvas over named drawings; each drawing compiles into one
// action with its rules and events on every change, so the picture and the
// Blueprint never drift apart. The script mode production carried is gone:
// nobody writes code anywhere in Cerulea.
// Without this tab a system accepts every value it is given.

import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import BoltIcon from '@mui/icons-material/Bolt';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';

import ControlMirror from '@/components/studio/common/ControlMirror';
import FormulaBar from '@/components/studio/common/FormulaBar';
import LogicCanvas from '@/components/studio/logic/LogicCanvas';
import { compileDrawing, eraseDrawing, writeDrawing } from '@/components/studio/logic/logic-blocks';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import { putAction, putRule, recordTypeOf, removeAction, removeRule } from '@/lib/blueprint/edit';
import { readAndCheck, scopeForCollection, writeFormula } from '@/lib/blueprint/formula';
import {
  TRANSACTION_CLASSES,
  type Action,
  type Blueprint,
  type Effect,
  type Rule,
  type TransactionClass,
} from '@/lib/blueprint/types';
import { recommendedTriggers, triggerOfAction, writeTrigger, type Grouping } from './step2-model';
import type { Drawing, LogicLayout } from './step2-types';

/** The plain sentence beside each transaction class. */
export const CLASS_MEANING: Record<TransactionClass, string> = {
  Routine: 'Everyday work. Cerulea commits it at the lowest threshold, so it confirms fast.',
  Financial: 'Moves value. A higher share of validators must agree before it commits.',
  Structural: 'Changes the shape of the system. A high share must agree.',
  Constitutional:
    'Changes the rules that govern the rules. The highest share must agree, and the change waits out a delay.',
};

export const EFFECT_KINDS = [
  { kind: 'Insert', label: 'Add a record' },
  { kind: 'Update', label: 'Change a record' },
  { kind: 'Delete', label: 'Remove a record' },
  { kind: 'Read', label: 'Read a record' },
] as const;

export type AccessManifest = { reads: string[]; writes: string[] };

/**
 * Derives the Access Manifest of one action from its effects.
 * Every Cerulea transaction declares the state it reads and writes before it
 * runs. Cerulea derives that declaration here rather than asking for it.
 */
export function accessManifestOf(effects: Effect[]): AccessManifest {
  const reads = new Set<string>();
  const writes = new Set<string>();
  const walk = (list: Effect[]) => {
    for (const effect of list) {
      if (effect.kind === 'Read') reads.add(effect.collection);
      if (effect.kind === 'Insert' || effect.kind === 'Update' || effect.kind === 'Delete') writes.add(effect.collection);
      if (effect.kind === 'Compensate') {
        walk(effect.effects);
        walk(effect.on_failure);
      }
    }
  };
  walk(effects);
  return { reads: [...reads].sort(), writes: [...writes].sort() };
}

/** States what one action does, in the words a person reads. */
export function describeAction(name: string, manifest: AccessManifest, transactionClass: TransactionClass): string {
  const reading = manifest.reads.length > 0 ? `reads ${manifest.reads.join(', ')}` : 'reads nothing';
  const writing = manifest.writes.length > 0 ? `writes ${manifest.writes.join(', ')}` : 'writes nothing';
  return `${name} ${reading} and ${writing}. Cerulea commits it as ${transactionClass.toLowerCase()} work.`;
}

/** Builds the effect one choice produces. */
export function buildEffect(kind: (typeof EFFECT_KINDS)[number]['kind'], collection: string): Effect {
  if (kind === 'Read') return { kind: 'Read', collection, key: { kind: 'Full' }, bind: `held_${collection}` };
  if (kind === 'Delete') return { kind: 'Delete', collection, key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } } };
  return {
    kind,
    collection,
    key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } },
    value: { kind: 'Param', name: 'record' },
  };
}

const FLOW_COLOR = '#8b5cf6';

export type BehaviorPanelProps = {
  blueprint: Blueprint;
  grouping: Grouping;
  track: 'dapp' | 'blockchain';
  layout: LogicLayout;
  onChange: (next: Blueprint) => void;
  onChangeLayout: (next: (held: LogicLayout) => LogicLayout) => void;
};

export default function BehaviorPanel({ blueprint, grouping, track, layout, onChange, onChangeLayout }: BehaviorPanelProps) {
  const theme = useTheme();
  const [mode, setMode] = useState<'cards' | 'visual'>('cards');
  const [ruleName, setRuleName] = useState('');
  const [actionName, setActionName] = useState('');
  const [drawingName, setDrawingName] = useState('');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ moduleId: string; when: string; then: string; why: string } | null>(null);

  const collectionIds = useMemo(() => blueprint.collections.map((entry) => entry.id), [blueprint.collections]);
  const drawings = useMemo(() => Object.values(layout.drawings), [layout.drawings]);
  const selectedDrawing = drawings.find((entry) => entry.id === selectedDrawingId) ?? drawings[0] ?? null;
  const compiled = useMemo(
    () => (selectedDrawing ? compileDrawing(selectedDrawing, blueprint) : null),
    [blueprint, selectedDrawing],
  );

  const addRule = () => {
    const id = toIdentifier(ruleName);
    if (id.length === 0 || blueprint.rules.some((entry) => entry.id === id)) return;
    const collection = blueprint.collections[0];
    const record = collection ? recordTypeOf(blueprint, collection) : null;
    const field = record?.fields[0]?.name ?? 'id';
    onChange(
      putRule(blueprint, {
        id,
        kind: 'Precondition',
        statement: `${ruleName.trim()} holds before the action runs.`,
        expression: {
          kind: 'Call',
          operator: 'is_present',
          arguments: [{ kind: 'Field', target: { kind: 'Param', name: 'record' }, field }],
        },
        collections: collection ? [collection.id] : [],
      }),
    );
    setRuleName('');
  };

  const addAction = () => {
    const id = toIdentifier(actionName);
    if (id.length === 0 || blueprint.actions.some((entry) => entry.id === id)) return;
    const collection = collectionIds[0];
    if (!collection) return;
    onChange(
      putAction(blueprint, {
        id,
        name: actionName.trim(),
        params: [],
        preconditions: [],
        effects: [buildEffect('Insert', collection)],
        emits: [],
        class: 'Routine',
        roles: blueprint.identities.roles.slice(0, 1).map((entry) => entry.id),
        description: `${actionName.trim()} records the work in ${toReadable(collection).toLowerCase()}.`,
      }),
    );
    setActionName('');
  };

  const addDrawing = () => {
    const name = drawingName.trim();
    const id = toIdentifier(name);
    if (name.length < 2 || layout.drawings[id]) return;
    const drawing: Drawing = {
      id,
      name,
      roles: blueprint.identities.roles.slice(0, 1).map((entry) => entry.id),
      nodes: [{ id: `${id}_start`, blockId: 'start', position: { x: 60, y: 120 }, props: {} }],
      edges: [],
    };
    onChangeLayout((held) => ({ ...held, drawings: { ...held.drawings, [id]: drawing } }));
    setSelectedDrawingId(id);
    setDrawingName('');
    setMode('visual');
  };

  const changeDrawing = (next: Drawing) => {
    onChangeLayout((held) => ({ ...held, drawings: { ...held.drawings, [next.id]: next } }));
    onChange(writeDrawing(blueprint, next).blueprint);
  };

  const removeDrawing = (drawing: Drawing) => {
    onChangeLayout((held) => {
      const drawings = { ...held.drawings };
      delete drawings[drawing.id];
      return { ...held, drawings };
    });
    onChange(eraseDrawing(blueprint, drawing.name));
    setSelectedDrawingId(null);
  };

  const triggerActions = (collectionIds: string[]) =>
    blueprint.actions
      .map((action) => ({ action, trigger: triggerOfAction(blueprint, action.id) }))
      .filter((entry) => entry.trigger !== null && collectionIds.includes(entry.trigger.collectionId));

  const commitDialog = () => {
    if (!dialog) return;
    const collectionId = (grouping.byModule[dialog.moduleId] ?? [])[0]?.id ?? collectionIds[0];
    if (!collectionId) return;
    onChange(
      writeTrigger(blueprint, {
        when: dialog.when.trim(),
        then: dialog.then.trim(),
        why: dialog.why.trim() || 'Added by hand.',
        collectionId,
      }),
    );
    setDialog(null);
  };

  return (
    <>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto', bgcolor: 'background.default' }} data-testid="behavior-panel">
        <Box
          sx={{
            px: 4,
            py: 2.5,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
            bgcolor: 'background.paper',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
                <BoltIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="h6" fontWeight={800}>
                  Logic &amp; Triggers
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                A rule states what the system refuses. An action states what the system does, and every
                action declares the records it reads and writes before it runs. That declaration is the
                Access Manifest, and it is what lets the Execution Engine run transactions in parallel.
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
              {(['cards', 'visual'] as const).map((entry) => (
                <Paper
                  key={entry}
                  variant="outlined"
                  role="tab"
                  aria-selected={mode === entry}
                  aria-label={entry === 'cards' ? 'Rules mode' : 'Visual mode'}
                  onClick={() => setMode(entry)}
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    bgcolor: mode === entry ? 'primary.main' : 'background.paper',
                    color: mode === entry ? 'white' : 'text.secondary',
                    borderColor: mode === entry ? 'primary.main' : 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                  elevation={0}
                >
                  {entry === 'cards' ? <BoltIcon sx={{ fontSize: 12 }} /> : <AccountTreeIcon sx={{ fontSize: 12 }} />}
                  {entry === 'cards' ? 'Rules' : 'Visual'}
                </Paper>
              ))}
            </Stack>
          </Stack>
        </Box>

        {mode === 'cards' && (
          <Box sx={{ flex: 1, p: 3 }}>
            <Stack spacing={2.5}>
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Rules
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  An invariant holds at every moment. A precondition holds before an action runs.
                </Typography>
                <Stack spacing={2}>
                  {blueprint.rules.map((rule) => (
                    <Stack key={rule.id} spacing={1.5} data-testid={`rule-${rule.id}`}>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>
                          <TextField
                            size="small"
                            label="What this rule holds"
                            value={rule.statement}
                            onChange={(event) => onChange(putRule(blueprint, { ...rule, statement: event.target.value }))}
                            fullWidth
                            inputProps={{ 'aria-label': `Statement of rule ${rule.id}` }}
                          />
                          <ControlMirror controlId="blueprint.rule_statement" dense />
                        </Box>
                        <Box sx={{ minWidth: 200 }}>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            label="When it holds"
                            value={rule.kind}
                            onChange={(event) => onChange(putRule(blueprint, { ...rule, kind: event.target.value as Rule['kind'] }))}
                            inputProps={{ 'aria-label': `Kind of rule ${rule.id}` }}
                          >
                            <MenuItem value="Invariant">At every moment</MenuItem>
                            <MenuItem value="Precondition">Before an action</MenuItem>
                          </TextField>
                          <ControlMirror controlId="blueprint.rule_kind" dense />
                        </Box>
                        <Box>
                          <Button size="small" color="error" onClick={() => onChange(removeRule(blueprint, rule.id))}>
                            Remove
                          </Button>
                        </Box>
                      </Stack>
                      <RuleFormula blueprint={blueprint} rule={rule} onChange={onChange} />
                    </Stack>
                  ))}
                  {blueprint.rules.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No rule yet. A system with no rule accepts every value it is given.
                    </Typography>
                  )}
                  <Divider />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      label="Add a rule"
                      value={ruleName}
                      onChange={(event) => setRuleName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') addRule();
                      }}
                      sx={{ minWidth: 280 }}
                      helperText="Name what must hold, such as an amount above zero."
                      inputProps={{ 'aria-label': 'Add a rule' }}
                    />
                    <Box>
                      <Button variant="outlined" onClick={addRule} disabled={ruleName.trim().length < 2}>
                        Add it
                      </Button>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                  Actions
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  An action is one thing a person or a program asks the system to do. Cerulea reads the
                  effects and derives the Access Manifest from them.
                </Typography>
                <Stack spacing={3}>
                  {blueprint.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      blueprint={blueprint}
                      collectionIds={collectionIds}
                      onChange={onChange}
                    />
                  ))}
                  {blueprint.actions.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No action yet. Add one so a person can change a record.
                    </Typography>
                  )}
                  <Divider />
                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      label="Add an action"
                      value={actionName}
                      onChange={(event) => setActionName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') addAction();
                      }}
                      sx={{ minWidth: 280 }}
                      helperText="Name the thing a person asks the system to do."
                      inputProps={{ 'aria-label': 'Add an action' }}
                    />
                    <Box>
                      <Button
                        variant="outlined"
                        onClick={addAction}
                        disabled={actionName.trim().length < 2 || collectionIds.length === 0}
                      >
                        Add it
                      </Button>
                    </Box>
                  </Stack>
                </Stack>
              </Paper>

              {grouping.modules
                .filter((mod) => (grouping.byModule[mod.id] ?? []).length > 0)
                .map((mod) => {
                  const collections = grouping.byModule[mod.id] ?? [];
                  const own = triggerActions(collections.map((entry) => entry.id));
                  const seeds = recommendedTriggers(collections).filter(
                    (seed) => blueprint.actions.some((action) => action.id === toIdentifier(seed.then)) === false,
                  );
                  return (
                    <Paper
                      key={mod.id}
                      variant="outlined"
                      sx={{ borderRadius: 1.5, overflow: 'hidden', borderColor: alpha(theme.palette.primary.main, 0.15) }}
                      data-testid={`module-triggers-${mod.id}`}
                    >
                      <Box
                        sx={{
                          px: 3,
                          py: 2,
                          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                          background: alpha(theme.palette.primary.main, 0.04),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                          <Typography variant="subtitle2" fontWeight={800}>
                            {mod.label}
                          </Typography>
                          {mod.category && (
                            <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                          )}
                        </Stack>
                        <Button
                          startIcon={<AddIcon />}
                          variant="outlined"
                          size="small"
                          onClick={() => setDialog({ moduleId: mod.id, when: '', then: '', why: '' })}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          Add Custom Trigger
                        </Button>
                      </Box>
                      <Box sx={{ p: 2.5 }}>
                        <Stack spacing={1.5}>
                          {own.length > 0 && (
                            <>
                              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                                TRIGGERS FOR {mod.label.toUpperCase()}
                              </Typography>
                              {own.map(({ action, trigger }) => (
                                <TriggerCard
                                  key={action.id}
                                  when={trigger?.when ?? ''}
                                  then={trigger?.then ?? action.name}
                                  why={trigger?.why ?? action.description}
                                  color={FLOW_COLOR}
                                  manifest={accessManifestOf(action.effects)}
                                  onDelete={() => onChange(removeAction(blueprint, action.id))}
                                />
                              ))}
                            </>
                          )}
                          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                            RECOMMENDED TRIGGERS FOR {mod.label.toUpperCase()}
                          </Typography>
                          {seeds.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                              Every recommendation for this module is already in the Blueprint.
                            </Typography>
                          )}
                          {seeds.map((seed) => (
                            <TriggerCard
                              key={`${seed.when}-${seed.then}`}
                              when={seed.when}
                              then={seed.then}
                              why={seed.why}
                              color="#3b82f6"
                              onAdd={() =>
                                onChange(
                                  writeTrigger(blueprint, {
                                    ...seed,
                                    collectionId:
                                      collections.find((entry) => seed.when.includes(toReadable(entry.id).toLowerCase()))?.id ??
                                      collections[0].id,
                                  }),
                                )
                              }
                            />
                          ))}
                        </Stack>
                      </Box>
                    </Paper>
                  );
                })}
            </Stack>
          </Box>
        )}

        {mode === 'visual' && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 3, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, flexWrap: 'wrap' }} useFlexGap>
              {drawings.map((drawing) => (
                <Chip
                  key={drawing.id}
                  label={drawing.name}
                  color={selectedDrawing?.id === drawing.id ? 'primary' : 'default'}
                  onClick={() => setSelectedDrawingId(drawing.id)}
                  onDelete={() => removeDrawing(drawing)}
                  aria-label={`Flow ${drawing.name}`}
                />
              ))}
              <TextField
                size="small"
                label="New flow"
                value={drawingName}
                onChange={(event) => setDrawingName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addDrawing();
                }}
                inputProps={{ 'aria-label': 'Name of the new flow' }}
                sx={{ minWidth: 220 }}
              />
              <Button variant="outlined" size="small" onClick={addDrawing} disabled={drawingName.trim().length < 2}>
                Draw it
              </Button>
              <Typography variant="caption" color="text.secondary">
                Each flow writes one action, with its rules and its events, as you draw.
              </Typography>
            </Stack>
            {selectedDrawing && compiled ? (
              <Box sx={{ flex: 1, minHeight: 520, position: 'relative' }}>
                <LogicCanvas
                  drawing={selectedDrawing}
                  blueprint={blueprint}
                  track={track}
                  compiled={compiled}
                  onChangeDrawing={changeDrawing}
                />
              </Box>
            ) : (
              <Box sx={{ p: 4 }}>
                <Alert severity="info">
                  <AlertTitle>No flow yet</AlertTitle>
                  Name a flow and draw it. The first block is placed for you.
                </Alert>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Dialog open={dialog !== null} onClose={() => setDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Add Custom Trigger</span>
          <IconButton size="small" onClick={() => setDialog(null)} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} pt={1}>
            <TextField
              label="When"
              size="small"
              fullWidth
              value={dialog?.when ?? ''}
              onChange={(event) => setDialog((held) => (held ? { ...held, when: event.target.value } : held))}
              helperText="The event that starts the trigger. Cerulea writes it to the Events section."
              inputProps={{ 'aria-label': 'When' }}
            />
            <TextField
              label="Then"
              size="small"
              fullWidth
              value={dialog?.then ?? ''}
              onChange={(event) => setDialog((held) => (held ? { ...held, then: event.target.value } : held))}
              helperText="What the system does. Cerulea writes it as an action that reads the record and announces the outcome."
              inputProps={{ 'aria-label': 'Then' }}
            />
            <TextField
              label="Why"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={dialog?.why ?? ''}
              onChange={(event) => setDialog((held) => (held ? { ...held, why: event.target.value } : held))}
              helperText="The reason a reviewer reads beside the action."
              inputProps={{ 'aria-label': 'Why' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!dialog || dialog.when.trim().length < 2 || dialog.then.trim().length < 2}
            onClick={commitDialog}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function TriggerCard({
  when,
  then,
  why,
  color,
  manifest,
  onAdd,
  onDelete,
}: {
  when: string;
  then: string;
  why: string;
  color: string;
  manifest?: AccessManifest;
  onAdd?: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  return (
    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: 1, borderColor: alpha(color, 0.25), bgcolor: alpha(color, 0.025) }}>
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            WHEN
          </Typography>
          <Box sx={{ mt: 0.5, px: 1.25, py: 0.6, borderRadius: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.35)}` }}>
            <BoltIcon sx={{ fontSize: 12, color }} />
            <Typography variant="body2" fontWeight={700} sx={{ color, fontSize: '0.75rem' }}>
              {when}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2.5, color: 'text.disabled', fontWeight: 900, fontSize: '1rem', flexShrink: 0 }}>&rarr;</Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            THEN
          </Typography>
          <Box sx={{ mt: 0.5, px: 1.25, py: 0.6, borderRadius: 0.75, display: 'inline-flex', alignItems: 'center', gap: 0.75, bgcolor: alpha(theme.palette.success.main, 0.07), border: `1px solid ${alpha(theme.palette.success.main, 0.25)}` }}>
            <AutoFixHighIcon sx={{ fontSize: 12, color: 'success.main' }} />
            <Typography variant="body2" fontWeight={700} sx={{ color: 'success.main', fontSize: '0.75rem' }}>
              {then}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 1.5, minWidth: 0 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>
            WHY
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>
            {why}
          </Typography>
          {manifest && (
            <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              {manifest.reads.map((entry) => (
                <Chip key={`r-${entry}`} size="small" variant="outlined" label={`reads ${entry}`} />
              ))}
              {manifest.writes.map((entry) => (
                <Chip key={`w-${entry}`} size="small" color="primary" label={`writes ${entry}`} />
              ))}
            </Stack>
          )}
        </Box>
        {onAdd && (
          <Tooltip title="Add to the Blueprint as an event and an action">
            <IconButton size="small" onClick={onAdd} aria-label={`Add the trigger ${then}`}>
              <AddIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
        {onDelete && (
          <Tooltip title="Remove">
            <IconButton size="small" color="error" onClick={onDelete} aria-label={`Remove the trigger ${then}`}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Paper>
  );
}

function ActionCard({
  action,
  blueprint,
  collectionIds,
  onChange,
}: {
  action: Action;
  blueprint: Blueprint;
  collectionIds: string[];
  onChange: (next: Blueprint) => void;
}) {
  const manifest = accessManifestOf(action.effects);
  const transactionClass = action.class ?? 'Routine';
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid={`action-${action.id}`}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 1 }}>
        <TextField
          size="small"
          label="What it does"
          value={action.name}
          onChange={(event) => onChange(putAction(blueprint, { ...action, name: event.target.value }))}
          fullWidth
          inputProps={{ 'aria-label': `Name of action ${action.id}` }}
        />
        <Box sx={{ minWidth: 220 }}>
          <TextField
            select
            size="small"
            fullWidth
            label="Kind of work"
            value={transactionClass}
            onChange={(event) => onChange(putAction(blueprint, { ...action, class: event.target.value as TransactionClass }))}
            helperText={CLASS_MEANING[transactionClass]}
            inputProps={{ 'aria-label': `Class of action ${action.id}` }}
          >
            {TRANSACTION_CLASSES.map((entry) => (
              <MenuItem key={entry} value={entry}>
                {entry}
              </MenuItem>
            ))}
          </TextField>
          <ControlMirror controlId="blueprint.action_class" dense />
        </Box>
        <TextField
          select
          size="small"
          label="Rule it checks first"
          value={action.preconditions[0] ?? ''}
          onChange={(event) =>
            onChange(putAction(blueprint, { ...action, preconditions: event.target.value ? [event.target.value] : [] }))
          }
          sx={{ minWidth: 240 }}
          helperText="The action stops when the rule fails."
          inputProps={{ 'aria-label': `Rule of action ${action.id}` }}
        >
          <MenuItem value="">No rule</MenuItem>
          {blueprint.rules.map((rule) => (
            <MenuItem key={rule.id} value={rule.id}>
              {rule.statement}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Who may run it"
          value={action.roles[0] ?? ''}
          onChange={(event) => onChange(putAction(blueprint, { ...action, roles: event.target.value ? [event.target.value] : action.roles }))}
          sx={{ minWidth: 200 }}
          helperText="A role from the Access & Roles tab."
          inputProps={{ 'aria-label': `Role of action ${action.id}` }}
        >
          {blueprint.identities.roles.map((role) => (
            <MenuItem key={role.id} value={role.id}>
              {role.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        {action.effects.map((effect, index) => (
          <TextField
            key={`${action.id}-effect-${index}`}
            select
            size="small"
            label={`${EFFECT_KINDS.find((entry) => entry.kind === effect.kind)?.label ?? effect.kind} ${index + 1}`}
            value={'collection' in effect ? effect.collection : ''}
            onChange={(event) =>
              onChange(
                putAction(blueprint, {
                  ...action,
                  effects: action.effects.map((entry, position) =>
                    position === index && (entry.kind === 'Insert' || entry.kind === 'Update' || entry.kind === 'Delete' || entry.kind === 'Read')
                      ? buildEffect(entry.kind, event.target.value)
                      : entry,
                  ),
                }),
              )
            }
            sx={{ minWidth: 220 }}
            inputProps={{ 'aria-label': `Collection of effect ${index + 1} of ${action.id}` }}
            disabled={'collection' in effect === false}
          >
            {collectionIds.map((entry) => (
              <MenuItem key={entry} value={entry}>
                {toReadable(entry)}
              </MenuItem>
            ))}
          </TextField>
        ))}
        <TextField
          select
          size="small"
          label="Add what it touches"
          value=""
          onChange={(event) =>
            onChange(
              putAction(blueprint, {
                ...action,
                effects: [...action.effects, buildEffect(event.target.value as (typeof EFFECT_KINDS)[number]['kind'], collectionIds[0] ?? 'record')],
              }),
            )
          }
          sx={{ minWidth: 220 }}
          inputProps={{ 'aria-label': `Add an effect to ${action.id}` }}
        >
          {EFFECT_KINDS.map((entry) => (
            <MenuItem key={entry.kind} value={entry.kind}>
              {entry.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        {describeAction(action.name, manifest, transactionClass)}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
        {manifest.reads.map((entry) => (
          <Chip key={`r-${entry}`} size="small" variant="outlined" label={`reads ${entry}`} />
        ))}
        {manifest.writes.map((entry) => (
          <Chip key={`w-${entry}`} size="small" color="primary" label={`writes ${entry}`} />
        ))}
      </Stack>
      <Button size="small" color="error" sx={{ mt: 1 }} onClick={() => onChange(removeAction(blueprint, action.id))}>
        Remove this action
      </Button>
    </Paper>
  );
}

/**
 * The formula bar beside one rule.
 * The bar reads the expression the rule already holds, checks every type as a
 * person types and writes the expression back when the reading is clean.
 */
export function RuleFormula({
  blueprint,
  rule,
  onChange,
}: {
  blueprint: Blueprint;
  rule: Rule;
  onChange: (next: Blueprint) => void;
}) {
  const collectionId = rule.collections[0] ?? blueprint.collections[0]?.id ?? '';
  const scope = useMemo(() => scopeForCollection(blueprint, collectionId), [blueprint, collectionId]);
  const [text, setText] = useState(() => writeFormula(rule.expression));

  const change = (next: string) => {
    setText(next);
    const reading = readAndCheck(next, scope);
    if (reading.expression && reading.fault === undefined) {
      onChange(putRule(blueprint, { ...rule, expression: reading.expression }));
    }
  };

  return (
    <FormulaBar
      label={`The formula behind ${toReadable(rule.id).toLowerCase()}`}
      plain="Cerulea checks this formula against the record while you type. A rule with a broken formula stops the whole Blueprint from compiling."
      scope={scope}
      value={text}
      onChange={change}
    />
  );
}
