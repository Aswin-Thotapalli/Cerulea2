// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

// The door into Studio.
// Studio opens the project the address names, or the project the person worked
// on last. The Blueprint of that project comes from Cerulea APIs, so the first
// screen is already populated.
// Without this module Studio would open on an empty canvas.

import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

import StudioShell from '@/app/_studio/shell/StudioShell';
import { type CeruleaApplication, useStudio } from '@/context/StudioContext';
import { StudioRouteError, api, readProjectBlueprint } from '@/lib/apiClient';

type Props = { projectId?: string | null };

type ProjectListing = {
  projectId: string;
  name: string;
  headVersion: number;
  workspaceId: string;
  workspaceApplication: string;
};

export default function StudioEntry({ projectId: initialProjectId }: Props) {
  const { setStudioState } = useStudio();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  useEffect(() => {
    async function open() {
      try {
        let chosen = initialProjectId ?? null;
        let listing: ProjectListing | undefined;

        const page = await api<{ projects: ProjectListing[] }>('/api/projects');
        if (chosen) {
          listing = page.projects.find((entry) => entry.projectId === chosen);
        } else {
          listing = page.projects[0];
          chosen = listing?.projectId ?? null;
          if (chosen) window.history.replaceState(null, '', `/?project=${chosen}`);
        }

        if (chosen && listing) {
          const blueprint = await readProjectBlueprint(chosen);
          setStudioState({
            projectId: chosen,
            workspaceId: listing.workspaceId,
            application: listing.workspaceApplication as CeruleaApplication,
            blueprint: blueprint.document,
            blueprintVersion: blueprint.version,
          });
          setInitialStep(1);
        }

        setResolvedId(chosen);
      } catch (cause) {
        setFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix:
            cause instanceof StudioRouteError
              ? cause.fix
              : 'Open Studio again. Report the problem to the Cerulea operator when it repeats.',
        });
      } finally {
        setReady(true);
      }
    }

    void open();
    // The door runs once per visit. A later change reaches Studio through the shell.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2">Cerulea is opening the project.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh', px: 2 }}>
        <Alert
          severity="error"
          sx={{ maxWidth: 560 }}
          action={
            <Button onClick={() => window.location.reload()} size="small">
              Open again
            </Button>
          }
        >
          <Typography sx={{ fontWeight: 700 }}>{failure.message}</Typography>
          <Typography variant="body2">{failure.fix}</Typography>
        </Alert>
      </Box>
    );
  }

  return <StudioShell initialStep={initialStep} initialProjectId={resolvedId} />;
}
