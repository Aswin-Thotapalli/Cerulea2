'use client';

// The permission matrix behind the governs links.
// Each row names a part that decides access and the parts it decides access to.
// Cerulea derives every row. A user changes a row by changing the permission
// matrix, never by drawing a line.
// Without a row here the part in it accepts every caller.

import React from 'react';
import { Alert, AlertTitle, Chip, Paper, Stack, Typography } from '@mui/material';

import type { CatalogueModule } from '@/lib/catalogue/types';
import { grantsOfRole, type PermissionMatrix } from '@/lib/map/governs';

export type GovernsMatrixProps = {
  matrix: PermissionMatrix;
  modules: CatalogueModule[];
};

export default function GovernsMatrix({ matrix, modules }: GovernsMatrixProps) {
  if (matrix.roles.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        <AlertTitle>No part decides access in this project yet</AlertTitle>
        Add an outcome that brings sign in, roles or compliance. Cerulea then draws the dotted lines
        that show who decides access to what.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Cerulea derives every line below from the permission matrix. A part with no line above it
        accepts every caller.
      </Typography>
      {matrix.roles.map((role) => (
        <Paper key={role.roleId} variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid="governs-role">
          <Typography variant="subtitle2" fontWeight={800}>
            {role.name}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {grantsOfRole(matrix, role.roleId, modules).map((title) => (
              <Chip key={title} size="small" variant="outlined" label={title} />
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
