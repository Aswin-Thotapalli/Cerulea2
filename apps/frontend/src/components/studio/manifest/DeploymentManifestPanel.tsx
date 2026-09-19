'use client';

// apps/frontend/src/components/studio/manifest/DeploymentManifestPanel.tsx
// The Deployment Manifest, with its three views over one dataset.
// The summary carries counts for a quick scan. The atomic view expands every
// item, grouped and searchable. The comparison view sets this manifest against
// an earlier one.
// Every line names the screen that produces it, and opening that screen takes
// one action.
// Without this panel a person would deploy without reading what they get.

import { useState } from 'react';
import { Box, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';

import ManifestSummary from './ManifestSummary';
import ManifestAtomic from './ManifestAtomic';
import ManifestComparisonView from './ManifestComparison';
import IntentReconciliation from './IntentReconciliation';
import RecommendationGaps from './RecommendationGaps';
import type { ManifestView } from '@/lib/manifest/types';

/** The three views, each with the sentence stating what it serves. */
export const MANIFEST_VIEWS: { id: ManifestView; label: string; serves: string }[] = [
  {
    id: 'summary',
    label: 'Summary',
    serves: 'Counts and headline figures, for a quick scan of the size.',
  },
  {
    id: 'atomic',
    label: 'Every item',
    serves: 'Every item expanded, grouped by the twelve groups and searchable.',
  },
  {
    id: 'comparison',
    label: 'Against an earlier version',
    serves: 'This manifest set against an earlier one, showing what moved.',
  },
];

export default function DeploymentManifestPanel({
  projectId,
  statement = '',
  outcomeNames = [],
  moduleIds = [],
  onOpenScreen,
}: {
  projectId: string;
  /** The plain-language goal the person stated at the entry door. */
  statement?: string;
  outcomeNames?: string[];
  /** The parts this deployment installs. */
  moduleIds?: string[];
  onOpenScreen?: (screen: string) => void;
}) {
  const [view, setView] = useState<ManifestView>('summary');
  const held = MANIFEST_VIEWS.find((entry) => entry.id === view);

  return (
    <Stack spacing={2} data-testid="deployment-manifest">
      <Paper variant="outlined" sx={{ px: 2, pt: 1, borderRadius: 3 }}>
        <Tabs value={view} onChange={(_event, next) => setView(next as ManifestView)}>
          {MANIFEST_VIEWS.map((entry) => (
            <Tab key={entry.id} value={entry.id} label={entry.label} />
          ))}
        </Tabs>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', py: 1 }}>
          {held?.serves}
        </Typography>
      </Paper>
      {statement.trim().length > 0 && (
        <IntentReconciliation
          projectId={projectId}
          statement={statement}
          outcomeNames={outcomeNames}
          onOpenScreen={onOpenScreen}
        />
      )}
      <RecommendationGaps moduleIds={moduleIds} onOpenScreen={onOpenScreen} />
      <Box>
        {view === 'summary' && (
          <ManifestSummary projectId={projectId} onOpenScreen={onOpenScreen} />
        )}
        {view === 'atomic' && <ManifestAtomic projectId={projectId} onOpenScreen={onOpenScreen} />}
        {view === 'comparison' && (
          <ManifestComparisonView projectId={projectId} onOpenScreen={onOpenScreen} />
        )}
      </Box>
    </Stack>
  );
}
