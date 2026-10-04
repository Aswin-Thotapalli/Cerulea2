'use client';

// apps/frontend/src/components/studio/steps/step2-EntityFieldEditor.tsx
// The field editor of the Data schema step, in the production grid.
// The grid edits the record type behind one collection. Each column means one
// thing in the Blueprint: the field name, the primitive kind, whether a value
// is always present, whether no two records share it (a unique index) and the
// value a new record starts with. The header edits the collection itself: its
// name, what it keeps, its privacy class, its retention and its purpose. A
// plain sentence sits beside every control.
// Without this editor the model stays exactly as composing left it.

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StorageIcon from '@mui/icons-material/Storage';
import KeyIcon from '@mui/icons-material/Key';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  FIELD_KINDS,
  FLOATING_POINT_NOTE,
  PRIVACY_MEANING,
  putCollection,
  putFields,
  recordTypeOf,
} from '@/lib/blueprint/edit';
import { LAWFUL_BASIS_NAMES, EXPIRY_NAMES } from '@/lib/blueprint/validate';
import type {
  Blueprint,
  Collection,
  PrivacyClass,
  RecordField,
  TypeExpression,
} from '@/lib/blueprint/types';
import {
  buildType,
  defaultHint,
  defaultText,
  describeType,
  isUnique,
  kindOf,
  literalFor,
  optionsOf,
  renameCollection,
  setOptions,
  setUnique,
} from './step2-model';

const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundImage: 'none',
      backgroundColor: (t: { palette: { mode: string } }) =>
        t.palette.mode === 'light' ? '#ffffff' : '#0D1535',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
  },
};

const GRID = '4px minmax(140px,1.2fr) 150px 110px 110px 36px';

const LAWFUL_BASIS_WORDS: Record<string, string> = {
  Consent: 'The person agreed',
  Contract: 'A contract needs it',
  LegalObligation: 'The law requires it',
  VitalInterest: 'A life depends on it',
  PublicTask: 'A public duty needs it',
  LegitimateInterest: 'A fair interest needs it',
};

const EXPIRY_WORDS: Record<string, string> = {
  Delete: 'Delete the record',
  Anonymise: 'Strip the personal values',
  Archive: 'Move it to the archive',
};

export type EntityFieldEditorProps = {
  blueprint: Blueprint;
  collection: Collection | null;
  isCore: boolean;
  onChange: (next: Blueprint) => void;
};

export default function EntityFieldEditor({ blueprint, collection, isCore, onChange }: EntityFieldEditorProps) {
  const theme = useTheme();
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [defaultDrafts, setDefaultDrafts] = useState<Record<string, string>>({});

  const record = useMemo(
    () => (collection ? recordTypeOf(blueprint, collection) : null),
    [blueprint, collection],
  );
  const collectionIds = useMemo(
    () => blueprint.collections.map((entry) => entry.id),
    [blueprint.collections],
  );
  const namedTypes = useMemo(
    () => blueprint.types.filter((entry) => entry.kind !== 'Record').map((entry) => entry.id),
    [blueprint.types],
  );

  if (!collection || !record) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.7,
          }}
        >
          <StorageIcon sx={{ fontSize: 28, color: 'primary.main' }} />
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6 }}>
          Choose an entity to edit its fields
        </Typography>
      </Box>
    );
  }

  const changeField = (index: number, field: RecordField) => {
    onChange(
      putFields(
        blueprint,
        record.id,
        record.fields.map((entry, position) => (position === index ? field : entry)),
      ),
    );
  };

  const addField = () => {
    let count = record.fields.length + 1;
    while (record.fields.some((entry) => entry.name === `field_${count}`)) count += 1;
    onChange(
      putFields(blueprint, record.id, [
        ...record.fields,
        {
          name: `field_${count}`,
          type: { kind: 'Text' },
          required: false,
          validation: [],
          description: 'State what this field holds.',
        },
      ]),
    );
  };

  const removeField = (index: number) => {
    if (record.fields.length <= 1) return;
    const field = record.fields[index];
    const next = putFields(
      blueprint,
      record.id,
      record.fields.filter((_entry, position) => position !== index),
    );
    onChange(
      putCollection(next, {
        ...collection,
        indexes: collection.indexes.filter((entry) => entry.fields.includes(field.name) === false),
        primary_key:
          collection.primary_key === field.name
            ? (record.fields.find((_entry, position) => position !== index)?.name ?? 'id')
            : collection.primary_key,
      }),
    );
  };

  const commitName = () => {
    if (nameDraft === null) return;
    const next = renameCollection(blueprint, collection.id, nameDraft);
    setNameDraft(null);
    if (next !== blueprint) onChange(next);
  };

  const changeCollection = (patch: Partial<Collection>) =>
    onChange(putCollection(blueprint, { ...collection, ...patch }));

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} data-testid="entity-field-editor">
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          flexShrink: 0,
          background:
            theme.palette.mode === 'dark'
              ? `linear-gradient(135deg, ${alpha('#4F46E5', 0.06)} 0%, ${alpha('#0D1535', 0.8)} 100%)`
              : alpha(theme.palette.background.paper, 0.9),
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} mb={0.5}>
          <TextField
            variant="standard"
            value={nameDraft ?? toReadable(collection.id)}
            onChange={(event) => setNameDraft(event.target.value)}
            onBlur={commitName}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitName();
            }}
            inputProps={{
              'aria-label': 'Entity name',
              'aria-describedby': 'mirror-collection-name',
              style: { fontSize: '1.4rem', fontWeight: 800 },
            }}
            InputProps={{ disableUnderline: true }}
          />
          <Chip
            label={isCore ? 'Core Entity' : 'Custom Entity'}
            size="small"
            variant="outlined"
            sx={
              isCore
                ? {
                    color: '#6366F1',
                    bgcolor: alpha('#6366F1', 0.12),
                    border: `1px solid ${alpha('#6366F1', 0.25)}`,
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }
                : { fontWeight: 700, fontSize: '0.7rem' }
            }
          />
          <Tooltip title={PRIVACY_MEANING[collection.privacy]}>
            <Chip label={collection.privacy} size="small" variant="outlined" />
          </Tooltip>
        </Stack>
        <Typography id="mirror-collection-name" variant="caption" color="text.secondary" display="block">
          Renaming carries every link, permission, rule and workflow to the new name.
        </Typography>
        <TextField
          variant="standard"
          placeholder="State what this collection keeps"
          value={collection.description}
          onChange={(event) => changeCollection({ description: event.target.value })}
          inputProps={{ 'aria-label': 'What this collection keeps', 'aria-describedby': 'mirror-collection-description' }}
          InputProps={{ disableUnderline: true, style: { fontSize: '0.82rem' } }}
          fullWidth
          sx={{ mt: 0.5 }}
        />
        <Typography id="mirror-collection-description" variant="caption" color="text.secondary" display="block">
          A reviewer reads this sentence in the Deployment Manifest.
        </Typography>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ mt: 2 }} alignItems="flex-start">
          <Box sx={{ minWidth: 200 }}>
            <TextField
              select
              size="small"
              fullWidth
              label="Privacy"
              value={collection.privacy}
              onChange={(event) => changeCollection({ privacy: event.target.value as PrivacyClass })}
              inputProps={{ 'aria-label': 'Privacy class' }}
            >
              {(Object.keys(PRIVACY_MEANING) as PrivacyClass[]).map((entry) => (
                <MenuItem key={entry} value={entry}>
                  {entry}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              {PRIVACY_MEANING[collection.privacy]}
            </Typography>
            <ControlMirror controlId="blueprint.collection_privacy" dense />
          </Box>
          <Box sx={{ minWidth: 150 }}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Kept for (days)"
              value={collection.retention.period_days}
              onChange={(event) => {
                const days = Number(event.target.value);
                if (Number.isInteger(days) && days >= 1 && days <= 36500) {
                  changeCollection({ retention: { ...collection.retention, period_days: days } });
                }
              }}
              inputProps={{ min: 1, max: 36500, 'aria-label': 'Retention period in days' }}
            />
            <ControlMirror controlId="blueprint.retention_days" dense />
          </Box>
          <Box sx={{ minWidth: 200 }}>
            <TextField
              select
              size="small"
              fullWidth
              label="When the period ends"
              value={collection.retention.on_expiry}
              onChange={(event) =>
                changeCollection({
                  retention: { ...collection.retention, on_expiry: event.target.value as Collection['retention']['on_expiry'] },
                })
              }
              inputProps={{ 'aria-label': 'What happens when the retention period ends' }}
            >
              {EXPIRY_NAMES.map((entry) => (
                <MenuItem key={entry} value={entry}>
                  {EXPIRY_WORDS[entry] ?? entry}
                </MenuItem>
              ))}
            </TextField>
            <ControlMirror controlId="blueprint.retention_expiry" dense />
          </Box>
          <Box sx={{ flex: 1, minWidth: 240 }}>
            <TextField
              size="small"
              fullWidth
              label="Why we keep it"
              value={collection.purpose.statement}
              onChange={(event) =>
                changeCollection({ purpose: { ...collection.purpose, statement: event.target.value } })
              }
              inputProps={{ 'aria-label': 'Purpose statement', maxLength: 400 }}
            />
            <TextField
              select
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              label="On what basis"
              value={collection.purpose.lawful_basis}
              onChange={(event) =>
                changeCollection({
                  purpose: {
                    ...collection.purpose,
                    lawful_basis: event.target.value as Collection['purpose']['lawful_basis'],
                  },
                })
              }
              inputProps={{ 'aria-label': 'Lawful basis' }}
            >
              {LAWFUL_BASIS_NAMES.map((entry) => (
                <MenuItem key={entry} value={entry}>
                  {LAWFUL_BASIS_WORDS[entry] ?? entry}
                </MenuItem>
              ))}
            </TextField>
            <ControlMirror controlId="blueprint.purpose" dense />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="subtitle1" fontWeight={800}>
              Fields
            </Typography>
            <Chip
              label={record.fields.length}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.62rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            />
            <Tooltip title={FLOATING_POINT_NOTE} arrow>
              <InfoOutlinedIcon
                sx={{ fontSize: 13, color: 'text.secondary', cursor: 'help', verticalAlign: 'middle' }}
              />
            </Tooltip>
          </Stack>
          <Button
            startIcon={<AddIcon />}
            size="small"
            onClick={addField}
            variant="contained"
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, #8b5cf6 100%)`,
              boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            Add Field
          </Button>
        </Stack>

        <Box sx={{ borderRadius: 1.5, overflow: 'hidden', border: `1px solid ${theme.palette.divider}` }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: GRID,
              alignItems: 'start',
              px: 2,
              py: 1,
              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.07 : 0.04),
              borderBottom: `1px solid ${theme.palette.divider}`,
              columnGap: 1,
            }}
          >
            <span />
            <Box id="mirror-field-name">
              <HeaderWord>Field Name</HeaderWord>
              <ControlMirror controlId="blueprint.field_name" dense />
            </Box>
            <Box id="mirror-field-type">
              <HeaderWord>Type</HeaderWord>
              <ControlMirror controlId="blueprint.field_type" dense />
            </Box>
            <Box id="mirror-field-constraints">
              <HeaderWord>Constraints</HeaderWord>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                Req: a value on every record. Unq: no two records share it.
              </Typography>
            </Box>
            <Box id="mirror-field-default">
              <HeaderWord>Default</HeaderWord>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                The value a new record starts with. The manifest lists it.
              </Typography>
            </Box>
            <span />
          </Box>

          {record.fields.map((field, index) => {
            const kind = kindOf(field.type);
            const isKey = field.name === collection.primary_key;
            const unique = isUnique(collection, field.name);
            const draftKey = `${collection.id}:${index}`;
            const defaultValue = defaultDrafts[draftKey] ?? defaultText(field);
            return (
              <Box
                key={`${collection.id}-${index}`}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  alignItems: 'center',
                  minHeight: 50,
                  columnGap: 1,
                  borderBottom: index < record.fields.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.025) },
                }}
              >
                <Box sx={{ height: '100%', bgcolor: isKey ? '#f59e0b' : '#4F46E5', opacity: 0.65, alignSelf: 'stretch' }} />

                <Box sx={{ px: 1.5, py: 0.75 }}>
                  <TextField
                    size="small"
                    fullWidth
                    value={field.name}
                    variant="standard"
                    onChange={(event) =>
                      changeField(index, { ...field, name: toIdentifier(event.target.value) })
                    }
                    inputProps={{
                      'aria-label': `Name of field ${index + 1}`,
                      'aria-describedby': 'mirror-field-name',
                    }}
                    InputProps={{
                      disableUnderline: true,
                      startAdornment: isKey ? <KeyIcon sx={{ fontSize: 13, color: '#f59e0b', mr: 0.5 }} /> : null,
                      style: { fontWeight: 700, fontSize: '0.87rem' },
                    }}
                  />
                  <TextField
                    size="small"
                    fullWidth
                    value={field.description}
                    variant="standard"
                    placeholder="What it holds"
                    onChange={(event) => changeField(index, { ...field, description: event.target.value })}
                    inputProps={{
                      'aria-label': `What field ${index + 1} holds`,
                      'aria-describedby': 'mirror-field-name',
                    }}
                    InputProps={{ disableUnderline: true, style: { fontSize: '0.72rem' } }}
                  />
                </Box>

                <Box sx={{ px: 1 }}>
                  <Select
                    size="small"
                    value={kind}
                    variant="standard"
                    disableUnderline
                    fullWidth
                    onChange={(event) =>
                      changeField(index, {
                        ...field,
                        type: buildType(event.target.value as TypeExpression['kind'], {
                          optional: field.type.kind === 'Optional',
                          collection: collectionIds.find((entry) => entry !== collection.id) ?? collectionIds[0],
                          named: namedTypes[0],
                        }),
                        default: undefined,
                      })
                    }
                    MenuProps={OPAQUE_MENU_PROPS as never}
                    inputProps={{
                      'aria-label': `Kind of field ${index + 1}`,
                      'aria-describedby': 'mirror-field-type',
                    }}
                    sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.78rem' }}
                  >
                    {FIELD_KINDS.map((entry) => (
                      <MenuItem key={entry.kind} value={entry.kind}>
                        <Tooltip title={entry.meaning} placement="right">
                          <span>{entry.label}</span>
                        </Tooltip>
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {describeType(field.type)}
                  </Typography>
                  {kind === 'Reference' && (
                    <Select
                      size="small"
                      variant="standard"
                      disableUnderline
                      fullWidth
                      value={referenceOf(field.type) ?? ''}
                      onChange={(event) =>
                        changeField(index, {
                          ...field,
                          type: buildType('Reference', {
                            optional: field.type.kind === 'Optional',
                            collection: event.target.value,
                          }),
                        })
                      }
                      inputProps={{ 'aria-label': `Collection field ${index + 1} links to` }}
                      sx={{ fontSize: '0.72rem' }}
                    >
                      {collectionIds.map((entry) => (
                        <MenuItem key={entry} value={entry}>
                          {toReadable(entry)}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                  {kind === 'Decimal' && (
                    <TextField
                      size="small"
                      variant="standard"
                      type="number"
                      label="Places"
                      value={scaleOf(field.type)}
                      onChange={(event) => {
                        const scale = Number(event.target.value);
                        if (Number.isInteger(scale) && scale >= 0 && scale <= 30) {
                          changeField(index, {
                            ...field,
                            type: buildType('Decimal', { optional: field.type.kind === 'Optional', scale }),
                          });
                        }
                      }}
                      inputProps={{ min: 0, max: 30, 'aria-label': `Decimal places of field ${index + 1}` }}
                      sx={{ width: 80 }}
                    />
                  )}
                  {kind === 'Named' && (
                    <TextField
                      size="small"
                      variant="standard"
                      fullWidth
                      placeholder="Options, comma separated"
                      value={optionsOf(blueprint, field).join(', ')}
                      onChange={(event) =>
                        onChange(
                          setOptions(
                            blueprint,
                            collection,
                            index,
                            event.target.value.split(',').map((entry) => entry.trim()),
                          ),
                        )
                      }
                      inputProps={{ 'aria-label': `Options of field ${index + 1}` }}
                      sx={{ '& input': { fontSize: '0.72rem', fontFamily: 'monospace' } }}
                    />
                  )}
                </Box>

                <Box sx={{ px: 1 }}>
                  <Stack direction="row" spacing={0.4}>
                    {[
                      {
                        label: 'Req',
                        active: field.required && field.type.kind !== 'Optional',
                        color: theme.palette.primary.main,
                        title: 'Required: a value on every record.',
                        toggle: () => {
                          const nextRequired = !(field.required && field.type.kind !== 'Optional');
                          const inner = field.type.kind === 'Optional' ? field.type.inner : field.type;
                          changeField(index, {
                            ...field,
                            required: nextRequired,
                            type: nextRequired ? inner : { kind: 'Optional', inner },
                          });
                        },
                      },
                      {
                        label: 'Unq',
                        active: unique || isKey,
                        color: '#8b5cf6',
                        title: 'Unique: no two records share the value. Cerulea keeps an index for it.',
                        toggle: () => {
                          if (isKey) return;
                          onChange(setUnique(blueprint, collection, field.name, !unique));
                        },
                      },
                    ].map((control) => (
                      <Tooltip key={control.label} title={control.title}>
                        <Box
                          role="switch"
                          aria-checked={control.active}
                          aria-label={`${control.title.split(':')[0]} for field ${index + 1}`}
                          aria-describedby="mirror-field-constraints"
                          tabIndex={0}
                          onClick={control.toggle}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') control.toggle();
                          }}
                          sx={{
                            px: 0.85,
                            py: 0.2,
                            borderRadius: 1,
                            cursor: 'pointer',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            userSelect: 'none',
                            bgcolor: control.active ? alpha(control.color, 0.15) : 'transparent',
                            color: control.active ? control.color : 'text.disabled',
                            border: `1px solid ${control.active ? alpha(control.color, 0.4) : theme.palette.divider}`,
                            transition: 'all 0.12s',
                            '&:hover': { bgcolor: alpha(control.color, 0.1) },
                          }}
                        >
                          {control.label}
                        </Box>
                      </Tooltip>
                    ))}
                  </Stack>
                </Box>

                <Box sx={{ px: 1 }}>
                  <Tooltip title={defaultHint(field.type)}>
                    <TextField
                      size="small"
                      placeholder="none"
                      value={defaultValue}
                      onChange={(event) => {
                        const text = event.target.value;
                        setDefaultDrafts((held) => ({ ...held, [draftKey]: text }));
                        const literal = literalFor(field.type, text);
                        if (text.trim().length === 0 || literal) {
                          changeField(index, { ...field, default: literal });
                        }
                      }}
                      onBlur={() =>
                        setDefaultDrafts((held) => {
                          const next = { ...held };
                          delete next[draftKey];
                          return next;
                        })
                      }
                      error={defaultValue.trim().length > 0 && literalFor(field.type, defaultValue) === undefined}
                      inputProps={{
                        'aria-label': `Default of field ${index + 1}`,
                        'aria-describedby': 'mirror-field-default',
                      }}
                      sx={{ '& .MuiInputBase-root': { fontSize: '0.78rem', borderRadius: 1.5 } }}
                    />
                  </Tooltip>
                </Box>

                <Box sx={{ pr: 0.5, display: 'flex', justifyContent: 'center' }}>
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={`Remove field ${field.name}`}
                    onClick={() => removeField(index)}
                    disabled={record.fields.length <= 1}
                    sx={{ opacity: 0.5, '&:hover': { opacity: 1, bgcolor: alpha('#ef4444', 0.08) } }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

function HeaderWord({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="caption"
      fontWeight={800}
      sx={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 0.8, color: 'text.disabled' }}
    >
      {children}
    </Typography>
  );
}

function referenceOf(type: TypeExpression): string | null {
  if (type.kind === 'Reference') return type.collection;
  if (type.kind === 'Optional' && type.inner.kind === 'Reference') return type.inner.collection;
  return null;
}

function scaleOf(type: TypeExpression): number {
  if (type.kind === 'Decimal') return type.scale;
  if (type.kind === 'Optional' && type.inner.kind === 'Decimal') return type.inner.scale;
  return 2;
}
