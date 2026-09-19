'use client';

// apps/frontend/src/components/studio/steps6/model/EntityEditor.tsx
// Step 3 Model, entities and fields.
// Every collection Cerulea composed appears here with the records it keeps.
// A field carries one of the Blueprint primitive types. Cerulea holds no
// floating point, so money is an exact decimal with a fixed scale.
// Without this editor the model would stay exactly as composing left it.

import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
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
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  FIELD_KINDS,
  FLOATING_POINT_NOTE,
  PRIVACY_MEANING,
  putCollection,
  putFields,
  recordTypeOf,
  removeCollection,
} from '@/lib/blueprint/edit';
import type {
  Blueprint,
  Collection,
  PrivacyClass,
  RecordField,
  TypeExpression,
} from '@/lib/blueprint/types';

/** Reads the kind a person chose back out of a field type. */
export function kindOf(type: TypeExpression): TypeExpression['kind'] {
  return type.kind === 'Optional' ? type.inner.kind : type.kind;
}

/** Builds the type expression one choice produces. */
export function buildType(
  kind: TypeExpression['kind'],
  options: { optional: boolean; collection?: string; named?: string; scale?: number },
): TypeExpression {
  let inner: TypeExpression;
  switch (kind) {
    case 'Decimal':
      inner = { kind: 'Decimal', scale: options.scale ?? 2 };
      break;
    case 'Reference':
      inner = { kind: 'Reference', collection: options.collection ?? 'record' };
      break;
    case 'Named':
      inner = { kind: 'Named', name: options.named ?? 'value' };
      break;
    case 'List':
      inner = { kind: 'List', element: { kind: 'Text' } };
      break;
    case 'Map':
      inner = { kind: 'Map', key: { kind: 'Text' }, value: { kind: 'Text' } };
      break;
    case 'Optional':
      inner = { kind: 'Text' };
      break;
    default:
      inner = { kind } as TypeExpression;
  }
  return options.optional ? { kind: 'Optional', inner } : inner;
}

/** States one field type in the words a person reads. */
export function describeType(type: TypeExpression): string {
  if (type.kind === 'Optional') return `${describeType(type.inner)}, and may be absent`;
  if (type.kind === 'Decimal') return `Exact decimal to ${type.scale} places`;
  if (type.kind === 'Reference') return `Links to a ${toReadable(type.collection).toLowerCase()}`;
  if (type.kind === 'Named') return `One of the ${toReadable(type.name).toLowerCase()} set`;
  if (type.kind === 'List') return `Several ${describeType(type.element).toLowerCase()}`;
  if (type.kind === 'Map') return 'Lookup table';
  return FIELD_KINDS.find((entry) => entry.kind === type.kind)?.label ?? type.kind;
}

export default function EntityEditor({
  blueprint,
  onChange,
}: {
  blueprint: Blueprint;
  onChange: (next: Blueprint) => void;
}) {
  const [newName, setNewName] = useState('');

  const collectionIds = useMemo(
    () => blueprint.collections.map((entry) => entry.id),
    [blueprint.collections],
  );
  const namedTypes = useMemo(
    () => blueprint.types.filter((entry) => entry.kind !== 'Record').map((entry) => entry.id),
    [blueprint.types],
  );

  const changeField = (collection: Collection, index: number, field: RecordField) => {
    const record = recordTypeOf(blueprint, collection);
    if (!record) return;
    const fields = record.fields.map((entry, position) => (position === index ? field : entry));
    onChange(putFields(blueprint, record.id, fields));
  };

  const addField = (collection: Collection) => {
    const record = recordTypeOf(blueprint, collection);
    if (!record) return;
    const name = `field_${record.fields.length + 1}`;
    onChange(
      putFields(blueprint, record.id, [
        ...record.fields,
        {
          name,
          type: { kind: 'Text' },
          required: false,
          validation: [],
          description: 'State what this field holds.',
        },
      ]),
    );
  };

  const removeField = (collection: Collection, index: number) => {
    const record = recordTypeOf(blueprint, collection);
    if (!record || record.fields.length <= 1) return;
    onChange(
      putFields(
        blueprint,
        record.id,
        record.fields.filter((_entry, position) => position !== index),
      ),
    );
  };

  const addCollection = () => {
    const id = toIdentifier(newName);
    if (id.length === 0 || collectionIds.includes(id)) return;
    const recordTypeId = `${id}_record`;
    const withType = {
      ...blueprint,
      types: [
        ...blueprint.types,
        {
          id: recordTypeId,
          kind: 'Record' as const,
          fields: [
            {
              name: 'id',
              type: { kind: 'Text' as const },
              required: true,
              validation: [],
              description: `The key Cerulea gives one ${toReadable(id).toLowerCase()}.`,
            },
          ],
          description: `One ${toReadable(id).toLowerCase()} record.`,
        },
      ],
    };
    onChange(
      putCollection(withType, {
        id,
        record_type: recordTypeId,
        primary_key: 'id',
        indexes: [],
        privacy: 'Open',
        retention: { period_days: 3650, on_expiry: 'Archive' },
        purpose: {
          statement: `We keep every ${toReadable(id).toLowerCase()} record so the system stays provable.`,
          lawful_basis: 'Contract',
        },
        description: `Every ${toReadable(id).toLowerCase()} the system keeps.`,
      }),
    );
    setNewName('');
  };

  return (
    <Stack spacing={3}>
      <Alert severity="info" variant="outlined">
        {FLOATING_POINT_NOTE}
      </Alert>

      {blueprint.collections.length === 0 && (
        <Alert severity="info">
          No records yet. Go back to Step 2 and pick a statement, or add the first collection below.
        </Alert>
      )}

      {blueprint.collections.map((collection) => {
        const record = recordTypeOf(blueprint, collection);
        return (
          <Accordion key={collection.id} defaultExpanded={blueprint.collections.length <= 3}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography sx={{ fontWeight: 800 }}>{toReadable(collection.id)}</Typography>
                <Chip size="small" label={`${record?.fields.length ?? 0} fields`} />
                <Tooltip title={PRIVACY_MEANING[collection.privacy]}>
                  <Chip size="small" variant="outlined" label={collection.privacy} />
                </Tooltip>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <TextField
                    size="small"
                    label="What this collection keeps"
                    value={collection.description}
                    onChange={(event) =>
                      onChange(
                        putCollection(blueprint, {
                          ...collection,
                          description: event.target.value,
                        }),
                      )
                    }
                    fullWidth
                    helperText="A reviewer reads this sentence in the Deployment Manifest."
                  />
                  <TextField
                    select
                    size="small"
                    label="Privacy"
                    value={collection.privacy}
                    onChange={(event) =>
                      onChange(
                        putCollection(blueprint, {
                          ...collection,
                          privacy: event.target.value as PrivacyClass,
                        }),
                      )
                    }
                    sx={{ minWidth: 220 }}
                    helperText={PRIVACY_MEANING[collection.privacy]}
                  >
                    {(Object.keys(PRIVACY_MEANING) as PrivacyClass[]).map((entry) => (
                      <MenuItem key={entry} value={entry}>
                        {entry}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Field</TableCell>
                      <TableCell>Holds</TableCell>
                      <TableCell>Needed</TableCell>
                      <TableCell>What it holds</TableCell>
                      <TableCell align="right">Remove</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(record?.fields ?? []).map((field, index) => (
                      <TableRow key={`${collection.id}-${field.name}-${index}`}>
                        <TableCell sx={{ width: 200 }}>
                          <TextField
                            size="small"
                            value={field.name}
                            onChange={(event) =>
                              changeField(collection, index, {
                                ...field,
                                name: toIdentifier(event.target.value),
                              })
                            }
                            inputProps={{ 'aria-label': `Name of field ${index + 1}` }}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 260 }}>
                          <TextField
                            select
                            size="small"
                            value={kindOf(field.type)}
                            onChange={(event) =>
                              changeField(collection, index, {
                                ...field,
                                type: buildType(event.target.value as TypeExpression['kind'], {
                                  optional: field.type.kind === 'Optional',
                                  collection: collectionIds[0],
                                  named: namedTypes[0],
                                }),
                              })
                            }
                            fullWidth
                            inputProps={{ 'aria-label': `Kind of field ${index + 1}` }}
                          >
                            {FIELD_KINDS.map((entry) => (
                              <MenuItem key={entry.kind} value={entry.kind}>
                                {entry.label}
                              </MenuItem>
                            ))}
                          </TextField>
                          <Typography variant="caption" color="text.secondary">
                            {describeType(field.type)}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <Button
                            size="small"
                            variant={field.required ? 'contained' : 'outlined'}
                            onClick={() =>
                              changeField(collection, index, {
                                ...field,
                                required: field.required === false,
                              })
                            }
                          >
                            {field.required ? 'Always' : 'May be absent'}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={field.description}
                            onChange={(event) =>
                              changeField(collection, index, {
                                ...field,
                                description: event.target.value,
                              })
                            }
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            aria-label={`Remove field ${field.name}`}
                            onClick={() => removeField(collection, index)}
                            disabled={(record?.fields.length ?? 0) <= 1}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Stack direction="row" spacing={2}>
                  <Button size="small" onClick={() => addField(collection)}>
                    Add a field
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    onClick={() => onChange(removeCollection(blueprint, collection.id))}
                  >
                    Remove this collection
                  </Button>
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add a collection
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            label="What it keeps"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            helperText="Cerulea gives the collection one key field, which stays changeable."
            sx={{ minWidth: 280 }}
          />
          <Box>
            <Button variant="outlined" onClick={addCollection} disabled={newName.trim().length < 2}>
              Add it
            </Button>
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="caption" color="text.secondary">
          A collection carries a privacy class, a retention period and a purpose. The compiler
          checks all three before a deployment starts.
        </Typography>
      </Paper>
    </Stack>
  );
}
