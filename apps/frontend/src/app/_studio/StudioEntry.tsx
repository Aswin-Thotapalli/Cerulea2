// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

// The door into Studio.
// A visitor holding no project meets the three doors. Describe it, browse it,
// or start fresh. Each door opens a project, and the project then runs the six
// steps once before it settles into a workspace.
// Without this module Studio would open on an empty canvas.

import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

import EntryDoors, { type EntryAnswer } from '@/components/studio/entry/EntryDoors';
import StudioProject from '@/components/studio/steps6/StudioProject';
import { StudioRouteError, api } from '@/lib/apiClient';
import type { BuildState } from '@/lib/studio/project-state';

type Props = { projectId?: string | null };

type ProjectListing = {
  projectId: string;
  name: string;
  workspaceId: string;
  workspaceApplication: string;
  updatedAt: string;
};

export default function StudioEntry({ projectId: initialProjectId }: Props) {
  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const describe = (cause: unknown) => ({
    message: cause instanceof Error ? cause.message : String(cause),
    fix:
      cause instanceof StudioRouteError
        ? cause.fix
        : 'Open Studio again. Report the problem to the Cerulea operator when it repeats.',
  });

  useEffect(() => {
    async function open() {
      try {
        if (initialProjectId) {
          setProjectId(initialProjectId);
          return;
        }
        const page = await api<{ projects: ProjectListing[] }>('/api/projects');
        const newest = page.projects[0];
        if (newest) {
          setProjectId(newest.projectId);
          window.history.replaceState(null, '', `/?project=${newest.projectId}`);
        }
      } catch (cause) {
        setFailure(describe(cause));
      } finally {
        setReady(true);
      }
    }
    void open();
  }, [initialProjectId]);

  const startProject = useCallback(async (answer: EntryAnswer) => {
    setOpening(true);
    setFailure(null);
    try {
      const created = await api<{ project: { projectId: string } }>('/api/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: answer.description?.slice(0, 80) || 'New system',
          summary: answer.description ?? '',
        }),
      });
      const opened = created.project.projectId;
      const held = await api<{ buildState: BuildState }>(
        `/api/projects/${encodeURIComponent(opened)}/build-state`,
      );
      await api(`/api/projects/${encodeURIComponent(opened)}/build-state`, {
        method: 'PUT',
        body: JSON.stringify({
          buildState: {
            ...held.buildState,
            foundation: {
              ...held.buildState.foundation,
              projectName: answer.description?.slice(0, 80) || 'New system',
              summary: answer.description ?? '',
              track: answer.track ?? held.buildState.foundation.track,
              templateId: answer.templateId ?? '',
              publishSelectedRecords:
                answer.publishSelectedRecords ?? held.buildState.foundation.publishSelectedRecords,
            },
            compose: {
              ...held.buildState.compose,
              outcomeIds: answer.outcomeIds ?? [],
            },
          },
        }),
      });
      window.history.replaceState(null, '', `/?project=${opened}`);
      setProjectId(opened);
    } catch (cause) {
      setFailure(describe(cause));
    } finally {
      setOpening(false);
    }
  }, []);

  if (!ready || opening) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography variant="body2">
            {opening ? 'Cerulea is opening the project.' : 'Cerulea is reading your work.'}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      {failure && (
        <Alert
          severity="error"
          sx={{ m: 3 }}
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              Open again
            </Button>
          }
        >
          <Typography sx={{ fontWeight: 700 }}>{failure.message}</Typography>
          <Typography variant="body2">{failure.fix}</Typography>
        </Alert>
      )}
      {projectId ? (
        <StudioProject projectId={projectId} />
      ) : (
        <Box sx={{ p: 4 }}>
          <EntryDoors onAnswer={(answer) => void startProject(answer)} />
        </Box>
      )}
    </Box>
  );
}
