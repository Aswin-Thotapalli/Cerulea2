'use client';

// apps/frontend/src/app/dashboard/integrations/page.tsx
// The Integrations panel.
// Two kinds of connection appear. The platform drivers Cerulea APIs runs, and
// the feeds, bridges and outbound triggers each Blueprint declares.
// Every row comes from a real read.
// Without this panel nobody can see what a deployment reaches outside itself.

import {
  Box,
  Chip,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { PanelBody, PanelEmpty, usePanelData } from '@/components/dashboard/PanelState';
import { describeCadence } from '@/components/dashboard/wording';

type IntegrationsView = {
  platform: {
    mode: 'local' | 'live';
    ready: boolean;
    checkedAt: string;
    drivers: { integration: string; kind: 'local' | 'live'; ready: boolean; detail: string }[];
  };
  projects: {
    projectId: string;
    projectName: string;
    workspaceName: string;
    version: number;
    feeds: {
      id: string;
      name: string;
      provider: string;
      cadence_seconds: number;
      attestation: string;
    }[];
    bridges: {
      id: string;
      target_network: string;
      direction: string;
      collection: string;
      confirmations: number;
    }[];
    triggers: { id: string; event: string; endpoint: string; signing: string; retries: number }[];
  }[];
};

export default function IntegrationsPanel() {
  const reading = usePanelData<IntegrationsView>('/api/dashboard/integrations', 20000);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Integrations
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Cerulea reaches outside itself in two ways. The platform drivers serve the service, and
        each system declares the feeds, the bridges and the outbound triggers it needs.
      </Typography>

      <PanelBody reading={reading} subject="every connection">
        {(view) => (
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Platform drivers
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`${view.platform.mode} mode`} />
                  <Chip
                    size="small"
                    color={view.platform.ready ? 'success' : 'warning'}
                    label={view.platform.ready ? 'Every driver ready' : 'A driver needs attention'}
                  />
                </Stack>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Every integration ships a live driver and a local driver behind one interface.
                Local mode runs real software on this machine rather than a fixed answer. Read at{' '}
                {new Date(view.platform.checkedAt).toLocaleTimeString()}.
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Integration</TableCell>
                    <TableCell>Driver</TableCell>
                    <TableCell>State</TableCell>
                    <TableCell>What the driver reports</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.platform.drivers.map((entry) => (
                    <TableRow key={entry.integration}>
                      <TableCell>{entry.integration}</TableCell>
                      <TableCell>{entry.kind}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={entry.ready ? 'success' : 'warning'}
                          label={entry.ready ? 'Ready' : 'Waiting'}
                        />
                      </TableCell>
                      <TableCell>{entry.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {view.projects.length === 0 ? (
              <PanelEmpty
                heading="No project yet"
                explanation="Open Studio and start a project. Every connection it declares appears here."
              />
            ) : (
              view.projects.map((project) => {
                const total =
                  project.feeds.length + project.bridges.length + project.triggers.length;
                return (
                  <Paper key={project.projectId} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {project.projectName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {project.workspaceName}, version {project.version}
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    {total === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        This system reaches nothing outside itself yet. Add a feed, a bridge or an
                        outbound trigger in Step 4 when it needs one.
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {project.feeds.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2">Feeds coming in</Typography>
                            {project.feeds.map((feed) => (
                              <Typography key={feed.id} variant="body2" color="text.secondary">
                                {feed.name} from {feed.provider}, {describeCadence(
                                  feed.cadence_seconds,
                                )}
                                , attested by {feed.attestation.toLowerCase()}.
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {project.bridges.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2">Bridges</Typography>
                            {project.bridges.map((bridge) => (
                              <Typography key={bridge.id} variant="body2" color="text.secondary">
                                {bridge.collection} moves {bridge.direction.toLowerCase()} to{' '}
                                {bridge.target_network} after {bridge.confirmations} confirmations.
                              </Typography>
                            ))}
                          </Box>
                        )}
                        {project.triggers.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2">Outbound triggers</Typography>
                            {project.triggers.map((trigger) => (
                              <Typography key={trigger.id} variant="body2" color="text.secondary">
                                {trigger.event} calls an address outside Cerulea, signed by{' '}
                                {trigger.signing.toLowerCase()}, retried {trigger.retries} times.
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Paper>
                );
              })
            )}
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
