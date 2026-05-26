// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import StudioShell from '@/app/_studio/shell/StudioShell';

type Props = { projectId?: string | null };

export default function StudioEntry({ projectId: initialProjectId }: Props) {
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      let pid = initialProjectId ?? null;

      // If no project param in URL, auto-detect the user's most recent project
      if (!pid) {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const j = await res.json();
            if (j.projects?.[0]?.id) {
              pid = j.projects[0].id;
              // Update URL so refresh / sharing works
              window.history.replaceState(null, '', `/?project=${pid}`);
            }
          }
        } catch {}
      }

      if (pid) {
        // Set project ID in localStorage so all steps can read/save to it
        localStorage.setItem('cerulea.projectId', pid);
        localStorage.setItem('cerulea.activeProjectId', pid);

        // Load project metadata (projectType etc.)
        try {
          const pRes = await fetch(`/api/projects/${pid}`);
          if (pRes.ok) {
            const { project } = await pRes.json();
            if (project?.projectType) {
              localStorage.setItem('cerulea.projectType', project.projectType);
            }
          }
        } catch {}

        // Load blueprint (step 1 canvas) — only overwrite if step1 hasn't been locally modified
        // for this specific project ID (prevents clobbering user edits on re-open)
        try {
          const bpRes = await fetch(`/api/projects/${pid}/blueprint`);
          if (bpRes.ok) {
            const { blueprint } = await bpRes.json();
            if (blueprint?.graph?.nodes?.length) {
              const graphKey = `cerulea.step1.graph`;
              // Only seed from DB if localStorage is empty or belongs to a different project
              const stored = localStorage.getItem(graphKey);
              const storedProjectId = localStorage.getItem('cerulea.projectId.last');
              if (!stored || storedProjectId !== pid) {
                localStorage.setItem(graphKey, JSON.stringify(blueprint.graph));
                localStorage.setItem('cerulea.projectId.last', pid);
              }
            }
          }
        } catch {}
      }

      setResolvedId(pid);
      setReady(true);
    }

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <StudioShell initialProjectId={resolvedId} />;
}
