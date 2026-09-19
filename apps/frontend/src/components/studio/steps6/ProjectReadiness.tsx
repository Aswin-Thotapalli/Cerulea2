'use client';

// apps/frontend/src/components/studio/steps6/ProjectReadiness.tsx
// What remains before deployment, in one line.
// The project list reads this beside every project, so a person sees where the
// work stands without opening it.
// Without this line a person would open each project to find out.

import { useEffect, useState } from 'react';
import { Chip, Skeleton, Tooltip } from '@mui/material';

import { api } from '@/lib/apiClient';

type ReadinessView = {
  remaining: number;
  advisory: number;
  ready: boolean;
  headline: string;
};

export default function ProjectReadiness({ projectId }: { projectId: string }) {
  const [view, setView] = useState<ReadinessView | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void api<ReadinessView>(`/api/projects/${encodeURIComponent(projectId)}/readiness`)
      .then((held) => {
        if (live) setView(held);
      })
      .catch(() => {
        if (live) setFailed(true);
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  if (failed) {
    return (
      <Tooltip title="Open the project and read the checklist there.">
        <Chip size="small" label="Read it in the project" />
      </Tooltip>
    );
  }
  if (!view) return <Skeleton width={120} height={24} />;

  return (
    <Tooltip title={view.headline}>
      <Chip
        size="small"
        color={view.ready ? 'success' : 'warning'}
        label={view.ready ? 'Ready to deploy' : `${view.remaining} remaining`}
      />
    </Tooltip>
  );
}
