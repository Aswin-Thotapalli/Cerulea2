'use client';

// apps/frontend/src/components/studio/interface/BindingPicker.tsx
// The bindings a component may read on a screen serving one role.
// The engine offers only the bindings the permission resolver admits, so an
// invalid binding never appears here and never reaches the Blueprint.
// Without the picker a person would type a collection name by hand.

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';

import { StudioRouteError } from '@/lib/apiClient';
import { readInterfaceBindings } from '@/lib/interface/studio';
import type { BindingChoice } from '@/lib/interface/types';

export type BindingPickerProps = {
  projectId: string;
  role: string;
  /** The name a person reads for the role. */
  roleName?: string;
  component: string;
  /** What the component reads. A component reading nothing shows the reason. */
  binds: string;
  onChoose?: (choice: BindingChoice) => void;
};

export default function BindingPicker({
  projectId,
  role,
  roleName,
  component,
  binds,
  onChoose,
}: BindingPickerProps) {
  const [choices, setChoices] = useState<BindingChoice[] | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  useEffect(() => {
    let live = true;
    if (binds === 'nothing' || role === '') {
      setChoices([]);
      setFailure(null);
      return () => {
        live = false;
      };
    }
    setChoices(null);
    setFailure(null);
    readInterfaceBindings(projectId, { role, component })
      .then((held) => {
        if (live) {
          setChoices(held.choices);
        }
      })
      .catch((error: unknown) => {
        if (!live) {
          return;
        }
        const held =
          error instanceof StudioRouteError
            ? { message: error.message.replace(` ${error.fix}`, ''), fix: error.fix }
            : {
                message: 'Cerulea did not answer with the bindings.',
                fix: 'Open the screen again, then choose the component.',
              };
        setFailure(held);
      });
    return () => {
      live = false;
    };
  }, [projectId, role, component, binds]);

  if (binds === 'nothing') {
    return (
      <Typography variant="body2" data-testid="binding-none">
        The {component} component reads nothing from the model. It places the components inside it.
      </Typography>
    );
  }

  if (role === '') {
    return (
      <Alert severity="info" data-testid="binding-no-role">
        The model declares no role yet. Add a role in Step 3, and the bindings each role reaches
        appear here.
      </Alert>
    );
  }

  if (failure !== null) {
    return (
      <Alert severity="error" data-testid="binding-failure">
        {failure.message} {failure.fix}
      </Alert>
    );
  }

  if (choices === null) {
    return <CircularProgress size={20} aria-label="Cerulea is reading the bindings" />;
  }

  if (choices.length === 0) {
    return (
      <Alert severity="info" data-testid="binding-empty">
        The {roleName ?? role} role reaches nothing this component reads. Grant the role a capability in the
        permission matrix, and the bindings appear here.
      </Alert>
    );
  }

  return (
    <Box data-testid="binding-picker">
      <Typography variant="subtitle2" component="h3">
        Bindings the {roleName ?? role} role reaches
      </Typography>
      <List dense aria-label="Legal bindings">
        {choices.map((choice) => (
          <ListItemButton
            key={`${choice.binding.kind}-${choice.label}`}
            onClick={() => onChoose?.(choice)}
          >
            <ListItemText primary={choice.label} secondary={choice.summary} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
