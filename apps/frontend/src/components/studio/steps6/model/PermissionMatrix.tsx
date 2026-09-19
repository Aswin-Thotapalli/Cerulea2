'use client';

// apps/frontend/src/components/studio/steps6/model/PermissionMatrix.tsx
// Step 3 Model, the permission matrix.
// One row per role, one column per collection, four actions in each cell. A
// cell narrows further to named fields and to a row condition, so a person
// reads only the records that concern them.
// The matrix writes the Blueprint Permissions section. The governs link on the
// module map derives from the same entries.
// Without an entry a role reaches nothing in that collection.

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
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

import { toIdentifier, toReadable } from '@/lib/blueprint/compose';
import {
  permissionFor,
  putRole,
  recordTypeOf,
  removeRole,
  setCapabilities,
} from '@/lib/blueprint/edit';
import type { Blueprint, PermissionCapability } from '@/lib/blueprint/types';

export const CAPABILITIES: PermissionCapability[] = ['Read', 'Create', 'Update', 'Delete'];

export const CAPABILITY_MEANING: Record<PermissionCapability, string> = {
  Read: 'Sees the records this collection holds.',
  Create: 'Adds a new record to this collection.',
  Update: 'Changes a record that already exists.',
  Delete: 'Removes a record, subject to the retention period.',
};

/** States what one cell allows, in the words a person reads. */
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
  const narrowed =
    fields.length > 0 ? ` Only these fields: ${fields.join(', ')}.` : ' Every field.';
  return `${roleName} may ${verbs} a ${collectionName.toLowerCase()} record.${narrowed}`;
}

export default function PermissionMatrix({
  blueprint,
  onChange,
}: {
  blueprint: Blueprint;
  onChange: (next: Blueprint) => void;
}) {
  const [newRole, setNewRole] = useState('');
  const [open, setOpen] = useState<{ roleId: string; collectionId: string } | null>(null);

  const roles = blueprint.identities.roles;
  const collections = blueprint.collections;

  const fieldsOf = useMemo(() => {
    const held = new Map<string, string[]>();
    for (const collection of collections) {
      const record = recordTypeOf(blueprint, collection);
      held.set(collection.id, (record?.fields ?? []).map((entry) => entry.name));
    }
    return held;
  }, [blueprint, collections]);

  const toggle = (roleId: string, collectionId: string, capability: PermissionCapability) => {
    const held = permissionFor(blueprint, roleId, collectionId);
    const capabilities = held?.capabilities ?? [];
    const next = capabilities.includes(capability)
      ? capabilities.filter((entry) => entry !== capability)
      : [...CAPABILITIES.filter((entry) => capabilities.includes(entry) || entry === capability)];
    onChange(setCapabilities(blueprint, { roleId, collectionId, capabilities: next }));
  };

  const addRole = () => {
    const id = toIdentifier(newRole);
    if (id.length === 0 || roles.some((entry) => entry.id === id)) return;
    onChange(putRole(blueprint, { id, name: newRole.trim(), credentials: [] }));
    setNewRole('');
  };

  const held = open ? permissionFor(blueprint, open.roleId, open.collectionId) : null;

  return (
    <Stack spacing={3}>
      <Alert severity="info" variant="outlined">
        <AlertTitle>A role reaches nothing until this matrix says so</AlertTitle>
        Cerulea resolves the permission before any state access. An empty cell means the role sees
        no record in that collection at all.
      </Alert>

      {collections.length === 0 && (
        <Alert severity="info">
          No collection yet. Open the Records surface and add what the system keeps, then set who
          reaches it.
        </Alert>
      )}

      {collections.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Role</TableCell>
                {collections.map((collection) => (
                  <TableCell key={collection.id} align="center">
                    <Tooltip title={collection.description}>
                      <span>{toReadable(collection.id)}</span>
                    </Tooltip>
                  </TableCell>
                ))}
                <TableCell align="right">Remove</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{role.name}</TableCell>
                  {collections.map((collection) => {
                    const entry = permissionFor(blueprint, role.id, collection.id);
                    const capabilities = entry?.capabilities ?? [];
                    return (
                      <TableCell key={collection.id} align="center">
                        <Stack direction="row" spacing={0.25} justifyContent="center">
                          {CAPABILITIES.map((capability) => (
                            <Tooltip key={capability} title={CAPABILITY_MEANING[capability]}>
                              <Chip
                                size="small"
                                label={capability[0]}
                                color={capabilities.includes(capability) ? 'primary' : 'default'}
                                variant={
                                  capabilities.includes(capability) ? 'filled' : 'outlined'
                                }
                                onClick={() => toggle(role.id, collection.id, capability)}
                                aria-label={`${capability} for ${role.name} on ${toReadable(collection.id)}`}
                              />
                            </Tooltip>
                          ))}
                        </Stack>
                        <Button
                          size="small"
                          onClick={() => setOpen({ roleId: role.id, collectionId: collection.id })}
                          disabled={capabilities.length === 0}
                        >
                          Narrow
                        </Button>
                      </TableCell>
                    );
                  })}
                  <TableCell align="right">
                    <Button
                      size="small"
                      color="error"
                      onClick={() => onChange(removeRole(blueprint, role.id))}
                      disabled={roles.length <= 1}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          What each row allows
        </Typography>
        <Stack spacing={0.5}>
          {roles.map((role) =>
            collections.map((collection) => (
              <Typography
                key={`${role.id}-${collection.id}`}
                variant="body2"
                color="text.secondary"
              >
                {describeCell(
                  role.name,
                  toReadable(collection.id),
                  permissionFor(blueprint, role.id, collection.id)?.capabilities ?? [],
                  permissionFor(blueprint, role.id, collection.id)?.fields ?? [],
                )}
              </Typography>
            )),
          )}
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Add a role
        </Typography>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            label="Role"
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
            helperText="A role names a job rather than a person. People join a role later."
            sx={{ minWidth: 280 }}
          />
          <Box>
            <Button variant="outlined" onClick={addRole} disabled={newRole.trim().length < 2}>
              Add it
            </Button>
          </Box>
        </Stack>
      </Paper>

      <Dialog open={open !== null} onClose={() => setOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Narrow what this role reaches</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Leave every field unticked to allow the whole record. Tick the fields to allow those
            alone.
          </Typography>
          <Stack>
            {(fieldsOf.get(open?.collectionId ?? '') ?? []).map((field) => (
              <FormControlLabel
                key={field}
                control={
                  <Checkbox
                    checked={(held?.fields ?? []).includes(field)}
                    onChange={(event) => {
                      if (!open) return;
                      const fields = event.target.checked
                        ? [...(held?.fields ?? []), field]
                        : (held?.fields ?? []).filter((entry) => entry !== field);
                      onChange(
                        setCapabilities(blueprint, {
                          roleId: open.roleId,
                          collectionId: open.collectionId,
                          capabilities: held?.capabilities ?? ['Read'],
                          fields,
                        }),
                      );
                    }}
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
              if (!open) return;
              onChange(
                setCapabilities(blueprint, {
                  roleId: open.roleId,
                  collectionId: open.collectionId,
                  capabilities: held?.capabilities ?? ['Read'],
                  fields: held?.fields ?? [],
                  rowFilter:
                    event.target.value === 'own'
                      ? {
                          kind: 'Call',
                          operator: 'equal',
                          arguments: [
                            {
                              kind: 'Field',
                              target: { kind: 'Param', name: 'record' },
                              field: ownerFieldOf(blueprint, open.collectionId),
                            },
                            { kind: 'Caller' },
                          ],
                        }
                      : undefined,
                }),
              );
            }}
            helperText="Every row, or only the rows this person owns."
          >
            <MenuItem value="every">Every row in the collection</MenuItem>
            <MenuItem value="own">Only the rows this person owns</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(null)}>Done</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

/**
 * Turns the Blueprint permission matrix into the shape the module map reads.
 *
 * The governs link on the map is derived from these entries rather than drawn.
 * A role is held by the part that keeps the roles. A grant names the part that
 * keeps the collection the entry covers.
 */
export function governsMatrixFromBlueprint(
  blueprint: Blueprint,
  placement: { roleModule: string; collectionModule: Record<string, string> },
): {
  roles: { roleId: string; name: string; heldBy: string }[];
  grants: { roleId: string; moduleId: string; statement: string }[];
} {
  const roles = blueprint.identities.roles.map((role) => ({
    roleId: role.id,
    name: role.name,
    heldBy: placement.roleModule,
  }));
  const grants = blueprint.permissions
    .filter((entry) => placement.collectionModule[entry.collection] !== undefined)
    .map((entry) => ({
      roleId: entry.role,
      moduleId: placement.collectionModule[entry.collection] as string,
      statement: describeCell(
        blueprint.identities.roles.find((role) => role.id === entry.role)?.name ?? entry.role,
        toReadable(entry.collection),
        entry.capabilities,
        entry.fields,
      ),
    }));
  return { roles, grants };
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
