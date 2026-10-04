'use client';

// apps/frontend/src/components/studio/steps/step2-GovernancePanel.tsx
// The Access & Roles tab of the Data schema step.
// One accordion per module, one row per collection, four columns for Create,
// Read, Update and Delete, as production drew it. Each cell holds one pill per
// role, read from the Identities section: a filled pill means the role holds
// that capability on that collection. A click toggles it. Narrow opens the
// built dialog that limits a role to named fields and to its own rows.
// The tab writes the Permissions section. An empty cell means the role reaches
// nothing in that collection.
// Without this tab a system would keep records nobody may read.

import React, { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import SecurityIcon from '@mui/icons-material/Security';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  permissionFor,
  putRole,
  recordTypeOf,
  removeRole,
  setCapabilities,
} from '@/lib/blueprint/edit';
import type { Blueprint, PermissionCapability, Role } from '@/lib/blueprint/types';
import type { Grouping } from './step2-model';

export const CAPABILITIES: PermissionCapability[] = ['Create', 'Read', 'Update', 'Delete'];

export const CAPABILITY_MEANING: Record<PermissionCapability, string> = {
  Read: 'Sees the records this collection holds.',
  Create: 'Adds a new record to this collection.',
  Update: 'Changes a record that already exists.',
  Delete: 'Removes a record, subject to the retention period.',
};

/** The colours the production pills cycle through, reused per role in order. */
const ROLE_COLOURS = ['#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

export function roleColour(index: number): string {
  return ROLE_COLOURS[index % ROLE_COLOURS.length];
}

/** States what one role holds on one collection, in the words a person reads. */
export function describeCell(
  roleName: string,
  collectionName: string,
  capabilities: PermissionCapability[],
  fields: string[],
): string {
  if (capabilities.length === 0) {
    return `${roleName} reaches no ${collectionName.toLowerCase()} record.`;
  }
  const verbs = capabilities.map((entry) => entry.toLowerCase()).join(', ');
  const narrowed = fields.length > 0 ? ` Only these fields: ${fields.join(', ')}.` : ' Every field.';
  return `${roleName} may ${verbs} a ${collectionName.toLowerCase()} record.${narrowed}`;
}

/** Finds the field that names the owner of a record, for the row condition. */
export function ownerFieldOf(blueprint: Blueprint, collectionId: string): string {
  const collection = blueprint.collections.find((entry) => entry.id === collectionId);
  if (!collection) return 'id';
  const record = recordTypeOf(blueprint, collection);
  const identity = (record?.fields ?? []).find(
    (field) =>
      field.type.kind === 'Identity' ||
      (field.type.kind === 'Optional' && field.type.inner.kind === 'Identity'),
  );
  return identity?.name ?? collection.primary_key;
}

export type GovernancePanelProps = {
  blueprint: Blueprint;
  grouping: Grouping;
  onChange: (next: Blueprint) => void;
};

export default function GovernancePanel({ blueprint, grouping, onChange }: GovernancePanelProps) {
  const theme = useTheme();
  const [newRole, setNewRole] = useState('');
  const [narrowing, setNarrowing] = useState<{ roleId: string; collectionId: string } | null>(null);

  const roles = blueprint.identities.roles;
  const roleIndex = useMemo(() => new Map(roles.map((role, index) => [role.id, index])), [roles]);

  const toggle = (roleId: string, collectionId: string, capability: PermissionCapability) => {
    const held = permissionFor(blueprint, roleId, collectionId);
    const capabilities = held?.capabilities ?? [];
    const next = capabilities.includes(capability)
      ? capabilities.filter((entry) => entry !== capability)
      : CAPABILITIES.filter((entry) => capabilities.includes(entry) || entry === capability);
    onChange(setCapabilities(blueprint, { roleId, collectionId, capabilities: next }));
  };

  const addRole = () => {
    const id = toIdentifier(newRole);
    if (id.length === 0 || roles.some((entry) => entry.id === id)) return;
    const role: Role = { id, name: newRole.trim(), credentials: [] };
    onChange(putRole(blueprint, role));
    setNewRole('');
  };

  const held = narrowing ? permissionFor(blueprint, narrowing.roleId, narrowing.collectionId) : null;
  const narrowFields = useMemo(() => {
    if (!narrowing) return [];
    const collection = blueprint.collections.find((entry) => entry.id === narrowing.collectionId);
    const record = collection ? recordTypeOf(blueprint, collection) : null;
    return (record?.fields ?? []).map((field) => field.name);
  }, [blueprint, narrowing]);

  const modulesWithRows = grouping.modules.filter((mod) => (grouping.byModule[mod.id] ?? []).length > 0);

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.default' }} data-testid="governance-panel">
      <Box sx={{ maxWidth: 1100, mx: 'auto', p: 4 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3} spacing={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <SecurityIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
              <Typography variant="h5" fontWeight={800}>
                Access Control Rules
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              A role reaches nothing until a pill says so. Click a pill to give that role the
              capability, or to take it away. Cerulea resolves the permission before any state access.
            </Typography>
            <ControlMirror controlId="blueprint.capability" dense />
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flexShrink: 0 }}>
            <Box>
              <TextField
                size="small"
                label="Add a role"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') addRole();
                }}
                inputProps={{ 'aria-label': 'Add a role', 'aria-describedby': 'mirror-role' }}
                sx={{ minWidth: 220 }}
              />
              <Typography id="mirror-role" variant="caption" color="text.secondary" display="block">
                A role names a job rather than a person. People join a role later.
              </Typography>
            </Box>
            <Button variant="outlined" onClick={addRole} disabled={newRole.trim().length < 2}>
              Add it
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
          {roles.map((role, index) => (
            <Chip
              key={role.id}
              label={role.name}
              size="small"
              sx={{
                fontWeight: 700,
                color: roleColour(index),
                bgcolor: alpha(roleColour(index), 0.1),
                border: `1px solid ${alpha(roleColour(index), 0.3)}`,
              }}
              onDelete={roles.length > 1 ? () => onChange(removeRole(blueprint, role.id)) : undefined}
              aria-label={`Role ${role.name}`}
            />
          ))}
        </Stack>

        {modulesWithRows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <SecurityIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add a collection on the Data Model tab, then set who reaches it.</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {modulesWithRows.map((mod) => {
              const collections = grouping.byModule[mod.id] ?? [];
              return (
                <Accordion
                  key={mod.id}
                  defaultExpanded
                  variant="outlined"
                  sx={{
                    borderRadius: '4px !important',
                    overflow: 'hidden',
                    '&:before': { display: 'none' },
                    borderColor: alpha('#8b5cf6', 0.15),
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: alpha('#8b5cf6', theme.palette.mode === 'dark' ? 0.08 : 0.04),
                      borderBottom: `1px solid ${alpha('#8b5cf6', 0.12)}`,
                      minHeight: 48,
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          bgcolor: alpha('#8b5cf6', 0.12),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <HexagonOutlinedIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={800}>
                        {mod.label}
                      </Typography>
                      {mod.category && (
                        <Chip
                          label={mod.category}
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', border: 'none' }}
                        />
                      )}
                      <Chip
                        label={`${collections.length} ${collections.length === 1 ? 'entity' : 'entities'}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.6rem' }}
                      />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr repeat(4, 1fr) 90px',
                        px: 3,
                        py: 1.25,
                        bgcolor: alpha(theme.palette.action.hover, 0.03),
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      {['Entity', ...CAPABILITIES, ''].map((heading) => (
                        <Tooltip
                          key={heading || 'narrow'}
                          title={CAPABILITY_MEANING[heading as PermissionCapability] ?? ''}
                        >
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}
                          >
                            {heading}
                          </Typography>
                        </Tooltip>
                      ))}
                    </Box>
                    {collections.map((collection, rowIndex) => (
                      <Box
                        key={collection.id}
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: '1.5fr repeat(4, 1fr) 90px',
                          alignItems: 'center',
                          px: 3,
                          py: 1.5,
                          minHeight: 52,
                          borderBottom: rowIndex < collections.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                        }}
                      >
                        <Box sx={{ minWidth: 0, overflow: 'hidden', pr: 2 }}>
                          <Typography variant="body2" fontWeight={700} noWrap>
                            {toReadable(collection.id)}
                          </Typography>
                          {collection.description && (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              noWrap
                              title={collection.description}
                              sx={{ fontSize: '0.68rem', display: 'block' }}
                            >
                              {collection.description}
                            </Typography>
                          )}
                        </Box>
                        {CAPABILITIES.map((capability) => (
                          <Stack key={capability} direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {roles.map((role) => {
                              const entry = permissionFor(blueprint, role.id, collection.id);
                              const active = entry?.capabilities.includes(capability) ?? false;
                              const colour = roleColour(roleIndex.get(role.id) ?? 0);
                              return (
                                <Tooltip
                                  key={role.id}
                                  title={describeCell(
                                    role.name,
                                    toReadable(collection.id),
                                    entry?.capabilities ?? [],
                                    entry?.fields ?? [],
                                  )}
                                >
                                  <Box
                                    role="switch"
                                    aria-checked={active}
                                    aria-label={`${capability} for ${role.name} on ${toReadable(collection.id)}`}
                                    tabIndex={0}
                                    onClick={() => toggle(role.id, collection.id, capability)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        toggle(role.id, collection.id, capability);
                                      }
                                    }}
                                    sx={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      px: 1.25,
                                      py: 0.4,
                                      borderRadius: 2,
                                      cursor: 'pointer',
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      userSelect: 'none',
                                      color: active ? colour : 'text.disabled',
                                      bgcolor: active ? alpha(colour, 0.12) : 'transparent',
                                      border: `1px solid ${active ? alpha(colour, 0.35) : theme.palette.divider}`,
                                      transition: 'all 0.12s',
                                      '&:hover': { bgcolor: alpha(colour, 0.2), borderColor: alpha(colour, 0.45) },
                                    }}
                                  >
                                    {role.name}
                                  </Box>
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        ))}
                        <Box>
                          <Tooltip title="Limit a role to named fields and to its own rows">
                            <span>
                              <Button
                                size="small"
                                onClick={() =>
                                  setNarrowing({
                                    roleId:
                                      roles.find((role) => permissionFor(blueprint, role.id, collection.id))?.id ??
                                      roles[0]?.id ??
                                      '',
                                    collectionId: collection.id,
                                  })
                                }
                                disabled={roles.every((role) => permissionFor(blueprint, role.id, collection.id) === null)}
                              >
                                Narrow
                              </Button>
                            </span>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Box>

      <Dialog open={narrowing !== null} onClose={() => setNarrowing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Narrow what a role reaches</DialogTitle>
        <DialogContent>
          <TextField
            select
            size="small"
            fullWidth
            sx={{ mt: 1, mb: 2 }}
            label="Role"
            value={narrowing?.roleId ?? ''}
            onChange={(event) =>
              setNarrowing((held) => (held ? { ...held, roleId: event.target.value } : held))
            }
            inputProps={{ 'aria-label': 'Role to narrow' }}
            helperText="Only a role that already holds a capability on this collection can be narrowed."
          >
            {roles
              .filter((role) => narrowing && permissionFor(blueprint, role.id, narrowing.collectionId))
              .map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
          </TextField>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Leave every field unticked to allow the whole record. Tick the fields to allow those alone.
          </Typography>
          <Stack>
            {narrowFields.map((field) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    checked={(held?.fields ?? []).includes(field)}
                    onChange={(event) => {
                      if (!narrowing || !held) return;
                      const fields = event.target.checked
                        ? [...held.fields, field]
                        : held.fields.filter((entry) => entry !== field);
                      onChange(
                        setCapabilities(blueprint, {
                          roleId: narrowing.roleId,
                          collectionId: narrowing.collectionId,
                          capabilities: held.capabilities,
                          fields,
                        }),
                      );
                    }}
                    inputProps={{ 'aria-label': `Allow field ${field}` }}
                  />
                }
                label={toReadable(field)}
              />
            ))}
          </Stack>
          <TextField
            select
            size="small"
            fullWidth
            sx={{ mt: 2 }}
            label="Which rows"
            value={held?.row_filter === undefined ? 'every' : 'own'}
            onChange={(event) => {
              if (!narrowing || !held) return;
              onChange(
                setCapabilities(blueprint, {
                  roleId: narrowing.roleId,
                  collectionId: narrowing.collectionId,
                  capabilities: held.capabilities,
                  fields: held.fields,
                  rowFilter:
                    event.target.value === 'own'
                      ? {
                          kind: 'Call',
                          operator: 'equal',
                          arguments: [
                            {
                              kind: 'Field',
                              target: { kind: 'Param', name: 'record' },
                              field: ownerFieldOf(blueprint, narrowing.collectionId),
                            },
                            { kind: 'Caller' },
                          ],
                        }
                      : undefined,
                }),
              );
            }}
            inputProps={{ 'aria-label': 'Which rows' }}
            helperText="Every row, or only the rows this person owns."
          >
            <MenuItem value="every">Every row in the collection</MenuItem>
            <MenuItem value="own">Only the rows this person owns</MenuItem>
          </TextField>
          <ControlMirror controlId="blueprint.row_filter" dense />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNarrowing(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
