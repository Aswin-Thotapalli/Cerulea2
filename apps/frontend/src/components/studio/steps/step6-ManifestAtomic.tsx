'use client';

// apps/frontend/src/components/studio/steps/step6-ManifestAtomic.tsx
// The Deployment Manifest, atomic view.
// Every item expanded, grouped by the twelve content groups and searchable.
// A reviewer compares the manifest against the idea the project started from
// and decides what to add or change.
// Every line names the screen that produces it.
// Without this view a reviewer would read the typed document instead.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import { StudioRouteError, api } from '@/lib/apiClient';
import {
  GROUP_WORDING,
  MANIFEST_GROUPS,
  linesOfGroup,
  searchLines,
  type ManifestGroup,
  type ManifestLine,
} from '@/lib/manifest/groups';
import { mirrorFor } from '@/lib/studio/mirror';
import type { AtomicReply, DeploymentManifest } from '@/lib/manifest/types';

export default function ManifestAtomic({
  projectId,
  onOpenScreen,
}: {
  projectId: string;
  onOpenScreen?: (screen: string) => void;
}) {
  const [manifest, setManifest] = useState<DeploymentManifest | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const read = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<AtomicReply>(
        `/api/projects/${encodeURIComponent(projectId)}/manifest?view=atomic`,
      );
      if (held.manifest === undefined || held.manifest === null) {
        setFailure({
          message: 'Cerulea answered with no manifest for this project.',
          fix: 'Read the manifest again. Report the problem to the Cerulea operator when it repeats.',
        });
        return;
      }
      setManifest(held.manifest);
      setVersion(held.version);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Make the corrections the checklist names, then read the manifest again.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const byGroup = useMemo(() => {
    if (manifest === null) return [] as { group: ManifestGroup; lines: ManifestLine[] }[];
    return MANIFEST_GROUPS.map((group) => ({
      group,
      lines: searchLines(linesOfGroup(manifest, group), search),
    }));
  }, [manifest, search]);

  const found = byGroup.reduce((total, entry) => total + entry.lines.length, 0);

  if (loading && manifest === null) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={24} />
          <Typography variant="body2">Cerulea is enumerating the manifest.</Typography>
        </Stack>
      </Box>
    );
  }

  if (failure) {
    return (
      <Alert severity="warning" data-testid="manifest-atomic-failure">
        <AlertTitle>{failure.message}</AlertTitle>
        {failure.fix}
      </Alert>
    );
  }

  if (manifest === null) return null;

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="manifest-atomic">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Every item this deployment installs
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {version !== null && <Chip size="small" label={`Version ${version}`} />}
          <Button size="small" onClick={() => void read()} disabled={loading}>
            Read again
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every line below is a real part of the system. Each one names the screen that produces it,
        so a change takes one step from here.
      </Typography>

      <TextField
        fullWidth
        size="small"
        label="Search every line"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        helperText={mirrorFor('manifest.search').does}
        sx={{ mb: 1 }}
        inputProps={{ 'aria-label': 'Search every line' }}
      />
      <Box data-mirror="manifest.search" sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {mirrorFor('manifest.search').breaks}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 2, fontWeight: 700 }} data-testid="manifest-found">
        {search.trim().length === 0
          ? `${found} lines across the twelve groups.`
          : `${found} lines hold those words.`}
      </Typography>

      {byGroup.map(({ group, lines }) => (
        <Accordion
          key={group}
          defaultExpanded={group === 'data'}
          disableGutters
          data-group={group}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 800 }}>{GROUP_WORDING[group].heading}</Typography>
              <Chip size="small" label={`${lines.length}`} />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {GROUP_WORDING[group].states}
            </Typography>
            {lines.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No line in this group holds those words. Clear the search to read every line again.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {lines.map((line, index) => (
                  <Paper
                    key={`${group}-${line.subject}-${index}`}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                    data-line-subject={line.subject}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      spacing={2}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        {line.subject}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => onOpenScreen?.(line.screen)}
                        disabled={onOpenScreen === undefined}
                      >
                        {line.screen}
                      </Button>
                    </Stack>
                    <Box
                      sx={{
                        mt: 1,
                        display: 'grid',
                        gap: 0.5,
                        gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
                      }}
                    >
                      {line.details.map((detail) => (
                        <Box key={detail.label} sx={{ display: 'contents' }}>
                          <Typography variant="caption" sx={{ fontWeight: 700 }}>
                            {detail.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {detail.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
}
