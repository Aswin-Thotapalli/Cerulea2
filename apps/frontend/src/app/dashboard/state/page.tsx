'use client';

// apps/frontend/src/app/dashboard/state/page.tsx
// The Versions panel.
// Every save that changes the content address produces a Blueprint version. A
// checkpoint names one version, so a person returns to a known good state.
// Every figure here comes from the version history Cerulea APIs holds.
// Without this panel nobody can see what changed and when.

import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

import {
  PanelBody,
  PanelEmpty,
  describeFailure,
  usePanelData,
  type PanelFailure,
} from '@/components/dashboard/PanelState';
import { api } from '@/lib/apiClient';
import { describeCounts, shortHash } from '@/components/dashboard/wording';

type StateView = {
  projects: {
    projectId: string;
    projectName: string;
    workspaceName: string;
    state: string;
    headVersion: number;
    blueprintHash: string;
    counts: Record<string, number>;
    versions: {
      blueprintId: string;
      version: number;
      blueprintHash: string;
      note: string;
      createdAt: string;
    }[];
    checkpoints: {
      checkpointId: string;
      label: string;
      note: string;
      version: number;
      createdAt: string;
    }[];
  }[];
};

export default function VersionsPanel() {
  const reading = usePanelData<StateView>('/api/dashboard/state');
  const [target, setTarget] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [working, setWorking] = useState(false);

  const take = async () => {
    if (!target) return;
    setWorking(true);
    setFailure(null);
    try {
      await api('/api/dashboard/state', {
        method: 'POST',
        body: JSON.stringify({ projectId: target, label, note }),
      });
      setTarget(null);
      setLabel('');
      setNote('');
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Versions and checkpoints
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Cerulea addresses every Blueprint by its content. Two equal Blueprints carry one address,
        and any change produces a new one.
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      <PanelBody reading={reading} subject="the version history">
        {(view) =>
          view.projects.length === 0 ? (
            <PanelEmpty
              heading="No project yet"
              explanation="Open Studio and start a project. Every save from that point appears here as a version."
            />
          ) : (
            <Stack spacing={3}>
              {view.projects.map((project) => (
                <Paper key={project.projectId} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {project.projectName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.workspaceName}, version {project.headVersion}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={project.state} />
                      <Button size="small" onClick={() => setTarget(project.projectId)}>
                        Take a checkpoint
                      </Button>
                    </Stack>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    The Blueprint holds {describeCounts(project.counts)}.
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Checkpoints
                  </Typography>
                  {project.checkpoints.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No checkpoint yet. Take one before a large change, so returning is one step.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                      {project.checkpoints.map((entry) => (
                        <Tooltip
                          key={entry.checkpointId}
                          title={`${entry.note || 'No note'} at version ${entry.version}`}
                        >
                          <Chip size="small" label={entry.label} />
                        </Tooltip>
                      ))}
                    </Stack>
                  )}

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Saves
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Version</TableCell>
                        <TableCell>Address</TableCell>
                        <TableCell>What changed</TableCell>
                        <TableCell>Saved</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {project.versions.map((version) => (
                        <TableRow key={version.blueprintId}>
                          <TableCell>{version.version}</TableCell>
                          <TableCell>
                            <Tooltip title={version.blueprintHash}>
                              <Typography component="code" variant="body2">
                                {shortHash(version.blueprintHash)}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>{version.note || 'No note on this save'}</TableCell>
                          <TableCell>{new Date(version.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ))}
            </Stack>
          )
        }
      </PanelBody>

      <Dialog open={target !== null} onClose={() => setTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Take a checkpoint</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              size="small"
              helperText="A name for this state, such as the date of a review."
            />
            <TextField
              label="Note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              size="small"
              multiline
              minRows={2}
              helperText="What this state holds. The note appears beside the checkpoint later."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTarget(null)}>Leave it</Button>
          <Button
            variant="contained"
            onClick={() => void take()}
            disabled={working || label.trim().length < 2}
          >
            Take the checkpoint
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
