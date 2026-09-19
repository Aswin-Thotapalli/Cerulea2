'use client';

// apps/frontend/src/components/studio/steps6/model/LogicEditor.tsx
// Step 3 Model, logic and triggers.
// A rule states what the system refuses. An action states what the system does,
// and every action declares the state it reads and writes before it runs. That
// declaration is what makes parallel execution and per-domain finality
// possible, so Cerulea derives it from the effects listed here.
// The editor writes the Blueprint Rules and Actions sections. The triggers
// picker draws the link between one part and another, offering valid pairs.
// Without a rule a system accepts every value it is given.

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import FormulaBar from './FormulaBar';
import TriggersPicker from '@/components/studio/map/TriggersPicker';
import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import { buildRelationCatalogue } from '@/lib/map/relations';
import { validTriggerPairs } from '@/lib/map/triggers';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  putAction,
  putRule,
  recordTypeOf,
  removeAction,
  removeRule,
} from '@/lib/blueprint/edit';
import { readAndCheck, scopeForCollection, writeFormula } from '@/lib/blueprint/formula';
import { TRANSACTION_CLASSES, type Blueprint, type Effect, type TransactionClass } from '@/lib/blueprint/types';


/** The plain sentence beside each transaction class. */
export const CLASS_MEANING: Record<TransactionClass, string> = {
  Routine: 'Everyday work. Cerulea commits it at the lowest threshold, so it confirms fast.',
  Financial: 'Moves value. A higher share of validators must agree before it commits.',
  Structural: 'Changes the shape of the system. A high share must agree.',
  Constitutional:
    'Changes the rules that govern the rules. The highest share must agree, and the change waits out a delay.',
};

export const EFFECT_KINDS = [
  { kind: 'Insert', label: 'Add a record', writes: true },
  { kind: 'Update', label: 'Change a record', writes: true },
  { kind: 'Delete', label: 'Remove a record', writes: true },
  { kind: 'Read', label: 'Read a record', writes: false },
] as const;

export type AccessManifest = {
  reads: string[];
  writes: string[];
};

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
      if (effect.kind === 'Insert' || effect.kind === 'Update' || effect.kind === 'Delete') {
        writes.add(effect.collection);
      }
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
export function describeAction(
  name: string,
  manifest: AccessManifest,
  transactionClass: TransactionClass,
): string {
  const reading = manifest.reads.length > 0 ? `reads ${manifest.reads.join(', ')}` : 'reads nothing';
  const writing =
    manifest.writes.length > 0 ? `writes ${manifest.writes.join(', ')}` : 'writes nothing';
  return `${name} ${reading} and ${writing}. Cerulea commits it as ${transactionClass.toLowerCase()} work.`;
}

/** Builds the effect one choice produces, writing every field the record declares. */
export function buildEffect(kind: (typeof EFFECT_KINDS)[number]['kind'], collection: string): Effect {
  if (kind === 'Read') {
    return { kind: 'Read', collection, key: { kind: 'Full' }, bind: `held_${collection}` };
  }
  if (kind === 'Delete') {
    return { kind: 'Delete', collection, key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } } };
  }
  return {
    kind,
    collection,
    key: { kind: 'Exact', value: { kind: 'Param', name: 'key' } },
    value: { kind: 'Param', name: 'record' },
  };
}

export default function LogicEditor({
  blueprint,
  onChange,
  moduleIds = [],
  chosenTriggers = [],
  onChosenTriggersChange,
}: {
  blueprint: Blueprint;
  onChange: (next: Blueprint) => void;
  moduleIds?: string[];
  chosenTriggers?: string[];
  onChosenTriggersChange?: (next: string[]) => void;
}) {
  const [ruleName, setRuleName] = useState('');
  const [actionName, setActionName] = useState('');

  const collectionIds = useMemo(
    () => blueprint.collections.map((entry) => entry.id),
    [blueprint.collections],
  );

  const triggerPairs = useMemo(
    () =>
      moduleIds.length === 0
        ? []
        : validTriggerPairs(moduleIds, SEED_MODULES, buildRelationCatalogue(SEED_TEMPLATES)),
    [moduleIds],
  );

  const addRule = () => {
    const id = toIdentifier(ruleName);
    if (id.length === 0 || blueprint.rules.some((entry) => entry.id === id)) return;
    const collection = collectionIds[0];
    const record = collection
      ? recordTypeOf(blueprint, blueprint.collections[0])
      : null;
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
        collections: collection ? [collection] : [],
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
        roles: blueprint.identities.roles.map((entry) => entry.id).slice(0, 1),
        description: `${actionName.trim()} records the work in ${toReadable(collection).toLowerCase()}.`,
      }),
    );
    setActionName('');
  };

  return (
    <Stack spacing={3}>
      <Alert severity="info" variant="outlined">
        <AlertTitle>Every action declares what it touches</AlertTitle>
        Cerulea reads the effects below and derives the Access Manifest from them. That declaration
        is what lets Cerulea run transactions in parallel and commit each domain on its own.
      </Alert>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Rules
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          A rule states what the system refuses. An invariant holds at every moment. A precondition
          holds before an action runs.
        </Typography>
        <Stack spacing={2}>
          {blueprint.rules.map((rule) => (
            <Stack key={rule.id} spacing={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                size="small"
                label="What this rule holds"
                value={rule.statement}
                onChange={(event) =>
                  onChange(putRule(blueprint, { ...rule, statement: event.target.value }))
                }
                fullWidth
              />
              <TextField
                select
                size="small"
                label="When it holds"
                value={rule.kind}
                onChange={(event) =>
                  onChange(
                    putRule(blueprint, {
                      ...rule,
                      kind: event.target.value as 'Invariant' | 'Precondition',
                    }),
                  )
                }
                sx={{ minWidth: 200 }}
                helperText={
                  rule.kind === 'Invariant'
                    ? 'Holds at every moment, so no change may break it.'
                    : 'Holds before an action runs, so the action stops when it fails.'
                }
              >
                <MenuItem value="Invariant">At every moment</MenuItem>
                <MenuItem value="Precondition">Before an action</MenuItem>
              </TextField>
              <Box>
                <Button
                  size="small"
                  color="error"
                  onClick={() => onChange(removeRule(blueprint, rule.id))}
                >
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
              sx={{ minWidth: 280 }}
              helperText="Name what must hold, such as an amount above zero."
            />
            <Box>
              <Button variant="outlined" onClick={addRule} disabled={ruleName.trim().length < 2}>
                Add it
              </Button>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Actions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          An action is one thing a person or a program asks the system to do.
        </Typography>
        <Stack spacing={3}>
          {blueprint.actions.map((action) => {
            const manifest = accessManifestOf(action.effects);
            const transactionClass = action.class ?? 'Routine';
            return (
              <Paper key={action.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 1 }}>
                  <TextField
                    size="small"
                    label="What it does"
                    value={action.name}
                    onChange={(event) =>
                      onChange(putAction(blueprint, { ...action, name: event.target.value }))
                    }
                    fullWidth
                  />
                  <TextField
                    select
                    size="small"
                    label="Kind of work"
                    value={transactionClass}
                    onChange={(event) =>
                      onChange(
                        putAction(blueprint, {
                          ...action,
                          class: event.target.value as TransactionClass,
                        }),
                      )
                    }
                    sx={{ minWidth: 220 }}
                    helperText={CLASS_MEANING[transactionClass]}
                  >
                    {TRANSACTION_CLASSES.map((entry) => (
                      <MenuItem key={entry} value={entry}>
                        {entry}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Rule it checks first"
                    value={action.preconditions[0] ?? ''}
                    onChange={(event) =>
                      onChange(
                        putAction(blueprint, {
                          ...action,
                          preconditions: event.target.value ? [event.target.value] : [],
                        }),
                      )
                    }
                    sx={{ minWidth: 240 }}
                    helperText="The action stops when the rule fails."
                  >
                    <MenuItem value="">No rule</MenuItem>
                    {blueprint.rules.map((rule) => (
                      <MenuItem key={rule.id} value={rule.id}>
                        {rule.statement}
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
                      label={`What it touches ${index + 1}`}
                      value={'collection' in effect ? effect.collection : ''}
                      onChange={(event) =>
                        onChange(
                          putAction(blueprint, {
                            ...action,
                            effects: action.effects.map((entry, position) =>
                              position === index
                                ? buildEffect(
                                    entry.kind as (typeof EFFECT_KINDS)[number]['kind'],
                                    event.target.value,
                                  )
                                : entry,
                            ),
                          }),
                        )
                      }
                      sx={{ minWidth: 220 }}
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
                          effects: [
                            ...action.effects,
                            buildEffect(
                              event.target.value as (typeof EFFECT_KINDS)[number]['kind'],
                              collectionIds[0] ?? 'record',
                            ),
                          ],
                        }),
                      )
                    }
                    sx={{ minWidth: 220 }}
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
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  {manifest.reads.map((entry) => (
                    <Chip key={`r-${entry}`} size="small" variant="outlined" label={`reads ${entry}`} />
                  ))}
                  {manifest.writes.map((entry) => (
                    <Chip key={`w-${entry}`} size="small" color="primary" label={`writes ${entry}`} />
                  ))}
                </Stack>
                <Button
                  size="small"
                  color="error"
                  sx={{ mt: 1 }}
                  onClick={() => onChange(removeAction(blueprint, action.id))}
                >
                  Remove this action
                </Button>
              </Paper>
            );
          })}
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
              sx={{ minWidth: 280 }}
              helperText="Name the thing a person asks the system to do."
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

      {onChosenTriggersChange && (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
            One part starting work in another
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Cerulea lists only the pairs that can genuinely trigger one another, so a link here
            always works.
          </Typography>
          <TriggersPicker
            pairs={triggerPairs}
            chosen={chosenTriggers}
            onToggle={(pair, next) => {
              const key = `${pair.from}->${pair.to}`;
              onChosenTriggersChange(
                next
                  ? [...chosenTriggers.filter((entry) => entry !== key), key]
                  : chosenTriggers.filter((entry) => entry !== key),
              );
            }}
          />
        </Paper>
      )}
    </Stack>
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
  rule: Blueprint['rules'][number];
  onChange: (next: Blueprint) => void;
}) {
  const collectionId = rule.collections[0] ?? blueprint.collections[0]?.id ?? '';
  const scope = useMemo(
    () => scopeForCollection(blueprint, collectionId),
    [blueprint, collectionId],
  );
  const [text, setText] = useState(() => writeFormula(rule.expression));

  useEffect(() => {
    setText(writeFormula(rule.expression));
  }, [rule.expression]);

  const change = (next: string) => {
    setText(next);
    const reading = readAndCheck(next, scope);
    if (reading.expression && reading.fault === undefined) {
      onChange(putRule(blueprint, { ...rule, expression: reading.expression }));
    }
  };

  return (
    <FormulaBar
      label={`The formula behind ${rule.id}`}
      plain="Cerulea checks this formula against the record while you type. A rule with a broken formula stops the whole Blueprint from compiling."
      scope={scope}
      value={text}
      onChange={change}
    />
  );
}
