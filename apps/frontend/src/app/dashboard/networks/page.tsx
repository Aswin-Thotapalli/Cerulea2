'use client';

// apps/frontend/src/app/dashboard/networks/page.tsx
// The Networks panel.
// Every value here comes from the node through Cerulea APIs. The height, the
// peer count, the finality distance and the measured throughput are read from
// the Blockchain itself.
// Without this panel an operator cannot tell whether the network is serving.

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

import {
  PanelBody,
  PanelEmpty,
  usePanelData,
} from '@/components/dashboard/PanelState';

type NetworkView = {
  network: {
    node: {
      systemName: string;
      systemVersion: string;
      chainName: string;
      kind: 'local' | 'live';
      peers: number;
      isSyncing: boolean;
      shouldHavePeers: boolean;
      observedAt: string;
    };
    head: { number: number; hash: string; author?: string; producedAt: string };
    finalizedBlock: number;
    finalityLag: number;
    epoch: number;
    round: number;
    validatorSetId: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: 'Healthy' | 'Degraded' | 'Critical';
    healthy: boolean;
    issues: string[];
  };
  measurement: {
    sampledBlocks: number;
    meanBlockSeconds: number;
    transactions: number;
    transactionsPerSecond: number;
    firstBlock: number;
    lastBlock: number;
    measuredAt: string;
  };
  deployments: {
    deploymentId: string;
    status: string;
    projectId: string;
    projectName: string;
    workspaceName: string;
  }[];
};

function Figure({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 220 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {explanation}
      </Typography>
    </Paper>
  );
}

export default function NetworksPanel() {
  const reading = usePanelData<NetworkView>('/api/dashboard/networks', 10000);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Networks
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We read the running Blockchain here. Every figure below comes from the node.
      </Typography>

      <PanelBody reading={reading} subject="the running Blockchain">
        {(view) => (
          <Stack spacing={4}>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Figure
                label="Newest block"
                value={String(view.network.head.number)}
                explanation="The height the node has reached. A rising height means the network is producing blocks."
              />
              <Figure
                label="Irreversible height"
                value={String(view.network.finalizedBlock)}
                explanation={`Blocks to this height cannot be undone. The newest block sits ${view.network.finalityLag} above it.`}
              />
              <Figure
                label="Validators serving"
                value={`${view.network.activeValidators} of ${view.network.totalValidators}`}
                explanation="Validators taking part in agreement now. Agreement stops when too few remain."
              />
              <Figure
                label="Peers"
                value={String(view.network.node.peers)}
                explanation={
                  view.network.node.shouldHavePeers
                    ? 'Other nodes this node is joined to. A count of zero isolates the node.'
                    : 'This node runs alone by design, so a count of zero is expected.'
                }
              />
            </Stack>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {view.network.node.chainName}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    label={view.network.healthy ? 'Serving' : 'Needs attention'}
                    color={view.network.healthy ? 'success' : 'warning'}
                  />
                  <Chip size="small" label={`Agreement ${view.network.consensusHealth}`} />
                  <Chip
                    size="small"
                    label={view.network.node.isSyncing ? 'Catching up' : 'In step'}
                  />
                </Stack>
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Node software
                  </Typography>
                  <Typography variant="body2">
                    {view.network.node.systemName} {view.network.node.systemVersion}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Epoch and round
                  </Typography>
                  <Typography variant="body2">
                    Epoch {view.network.epoch}, round {view.network.round}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Validator set
                  </Typography>
                  <Typography variant="body2">Set {view.network.validatorSetId}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Read at
                  </Typography>
                  <Typography variant="body2">
                    {new Date(view.network.node.observedAt).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Stack>
              {view.network.issues.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Open items</Typography>
                  {view.network.issues.map((issue) => (
                    <Typography key={issue} variant="body2" color="text.secondary">
                      {issue}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Measured behaviour
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We measured blocks {view.measurement.firstBlock} to {view.measurement.lastBlock}.
                Every figure below comes from those blocks.
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Figure
                  label="Transactions each second"
                  value={view.measurement.transactionsPerSecond.toFixed(2)}
                  explanation={`Across ${view.measurement.sampledBlocks} blocks carrying ${view.measurement.transactions} transactions.`}
                />
                <Figure
                  label="Seconds between blocks"
                  value={view.measurement.meanBlockSeconds.toFixed(2)}
                  explanation="The mean gap across the sample. A widening gap slows every confirmation."
                />
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Deployments on this network
              </Typography>
              {view.deployments.length === 0 ? (
                <PanelEmpty
                  heading="No system is deployed yet"
                  explanation="Finish a project in Studio and deploy it. The deployment appears here with its stages."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Workspace</TableCell>
                      <TableCell>State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {view.deployments.map((entry) => (
                      <TableRow key={entry.deploymentId}>
                        <TableCell>{entry.projectName}</TableCell>
                        <TableCell>{entry.workspaceName}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={entry.status.replace('_', ' ')}
                            color={entry.status === 'succeeded' ? 'success' : 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
