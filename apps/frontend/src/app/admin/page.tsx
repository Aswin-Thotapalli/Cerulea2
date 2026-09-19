'use client';

// apps/frontend/src/app/admin/page.tsx
// The platform screen of the Cerulea operator.
// Every count comes from a query over the platform database. The Blockchain
// figures and the driver states come from the node and the driver set.
// Without this screen the operator cannot tell whether the platform is serving.

import { Box, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

import { PanelBody, usePanelData } from '@/components/dashboard/PanelState';

type OperatorSummary = {
  platform: {
    mode: string;
    chainName: string;
    chainKind: string;
    head: number;
    finalizedBlock: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
    issues: string[];
    drivers: { integration: string; kind: string; ready: boolean; detail: string }[];
    readAt: string;
  };
  counts: Record<string, number>;
};

const COUNT_MEANING: Record<string, string> = {
  accounts: 'Accounts opened on this platform.',
  accountsWithSecondFactor: 'Accounts holding an active second factor.',
  openSessions: 'Sessions open and inside their window.',
  workspaces: 'Workspaces holding work.',
  projects: 'Projects across every workspace.',
  blueprintVersions: 'Blueprint versions saved.',
  checkpoints: 'Named checkpoints taken.',
  deployments: 'Deployments started.',
  openKeys: 'Access keys that still work.',
  openSubscriptions: 'Subscriptions paying for capacity.',
  auditEvents: 'Changes recorded in the audit log.',
  refusedActions: 'Actions Cerulea refused.',
};

export default function OperatorPlatformScreen() {
  const reading = usePanelData<OperatorSummary>('/api/admin/summary', 20000);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Platform
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We read the platform database, the node and the driver set. No customer record appears on
        this screen.
      </Typography>

      <PanelBody reading={reading} subject="the platform">
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
                  {view.platform.chainName}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`${view.platform.mode} mode`} />
                  <Chip
                    size="small"
                    color={view.platform.healthy ? 'success' : 'warning'}
                    label={view.platform.healthy ? 'Serving' : 'Needs attention'}
                  />
                  <Chip size="small" label={`Agreement ${view.platform.consensusHealth}`} />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Newest block
                  </Typography>
                  <Typography variant="h6">{view.platform.head}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Irreversible height
                  </Typography>
                  <Typography variant="h6">{view.platform.finalizedBlock}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Validators serving
                  </Typography>
                  <Typography variant="h6">
                    {view.platform.activeValidators} of {view.platform.totalValidators}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Read at
                  </Typography>
                  <Typography variant="h6">
                    {new Date(view.platform.readAt).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Stack>
              {view.platform.issues.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Open items</Typography>
                  {view.platform.issues.map((issue) => (
                    <Typography key={issue} variant="body2" color="text.secondary">
                      {issue}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Platform drivers
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
                  {view.platform.drivers.map((driver) => (
                    <TableRow key={driver.integration}>
                      <TableCell>{driver.integration}</TableCell>
                      <TableCell>{driver.kind}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={driver.ready ? 'success' : 'warning'}
                          label={driver.ready ? 'Ready' : 'Waiting'}
                        />
                      </TableCell>
                      <TableCell>{driver.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                What the platform holds
              </Typography>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                {Object.entries(view.counts).map(([name, total]) => (
                  <Box key={name} sx={{ minWidth: 200 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {COUNT_MEANING[name] ?? name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
