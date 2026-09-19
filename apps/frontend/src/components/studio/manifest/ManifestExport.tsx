'use client';

// apps/frontend/src/components/studio/manifest/ManifestExport.tsx
// The Deployment Manifest export.
// The document follows the Cerulea house format and serves as the
// specification handed to auditors, procurement reviewers and internal
// approvers. The JSON export carries the same content for a system that reads
// it.
// Both are produced in the browser, so nothing leaves the machine to make them.
// Without the export a reviewer receives a screen and writes the document by
// hand.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { jsonExport, planFor } from '@/lib/manifest/document';
import { packWordDocument } from '@/lib/manifest/word';
import type { AtomicReply } from '@/lib/manifest/types';

/** Hands one file to the browser to save. */
export function saveFile(content: Blob, fileName: string): void {
  const address = URL.createObjectURL(content);
  const link = window.document.createElement('a');
  link.href = address;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(address);
}

export default function ManifestExport({
  projectId,
  statement = '',
}: {
  projectId: string;
  statement?: string;
}) {
  const [reading, setReading] = useState<AtomicReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
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
      setReading(held);
      setFailure(null);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Make the corrections the checklist names, then export the manifest again.',
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void read();
  }, [read]);

  const exportDocument = async () => {
    if (reading === null) return;
    setWorking(true);
    setSaved(null);
    try {
      const plan = planFor({
        manifest: reading.manifest,
        version: reading.version,
        statement,
        modules: SEED_MODULES,
      });
      saveFile(await packWordDocument(plan), `${plan.fileName}.docx`);
      setSaved(`Cerulea saved ${plan.fileName}.docx to this machine.`);
    } catch (cause) {
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix: 'Export the manifest again. Report the problem to the Cerulea operator when it repeats.',
      });
    } finally {
      setWorking(false);
    }
  };

  const exportJson = () => {
    if (reading === null) return;
    const plan = planFor({
      manifest: reading.manifest,
      version: reading.version,
      statement,
      modules: SEED_MODULES,
    });
    const body = jsonExport({
      manifest: reading.manifest,
      version: reading.version,
      statement,
      modules: SEED_MODULES,
    });
    saveFile(
      new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }),
      `${plan.fileName}.json`,
    );
    setSaved(`Cerulea saved ${plan.fileName}.json to this machine.`);
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="manifest-export">
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        Hand this manifest to a reviewer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        The document follows the Cerulea house format and serves as the specification an auditor, a
        procurement reviewer or an internal approver reads. The second file carries the same
        content for a system that reads it.
      </Typography>

      {failure && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="manifest-export-failure">
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(null)}>
          {saved}
        </Alert>
      )}

      {loading && reading === null ? (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">Cerulea is reading the manifest.</Typography>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            onClick={() => void exportDocument()}
            disabled={working || reading === null}
          >
            {working ? 'Building the document' : 'Save the document'}
          </Button>
          <Button variant="outlined" onClick={exportJson} disabled={reading === null}>
            Save the data file
          </Button>
        </Stack>
      )}
    </Paper>
  );
}
