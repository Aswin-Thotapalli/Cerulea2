'use client';

// apps/frontend/src/app/dashboard/networks/page.tsx
// The Networks screen.
// Every row reads /api/dashboard/networks, which opens the Blockchain each
// deployment runs and reads its height, its validators and its region from
// the node. The chain card and the measured behaviour come from the node
// Studio is joined to. Nothing on this screen is estimated.
// Without this screen an operator cannot tell whether a network is serving.

import {
  Box, Typography, Paper, Stack, Chip, Button, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Tooltip, Alert, AlertTitle,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import HubIcon from '@mui/icons-material/Hub';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { usePanelData } from '@/components/dashboard/PanelState';
import {
  explorerUrl,
  newProjectUrl,
  openInNewTab,
  openProjectUrl,
} from '@/components/dashboard/studio-links';
import { relativeTime } from '@/components/dashboard/time';

/** One row as /api/dashboard/networks writes it. */
type Network = {
  id: string;
  name: string;
  type: 'Blockchain' | 'dApp';
  projectType: 'dapp' | 'blockchain' | null;
  division: string;
  status: string;
  blockHeight: number | null;
  finalizedBlock: number | null;
  tps: number | null;
  sampledBlocks: number | null;
  measuredAt: string | null;
  consensusHealth: number | null;
  consensusState: string | null;
  activeValidators: number | null;
  totalValidators: number | null;
  peers: number | null;
  chainName: string | null;
  region: string | null;
  deploymentId: string | null;
  deploymentState: string | null;
  host: string | null;
  basePath: string | null;
  failureReason: string | null;
  unreachableReason: string | null;
  workspaceName: string;
};

/** The answer of /api/dashboard/networks, exactly as the route writes it. */
type NetworksView = {
  networks: Network[];
  chain: {
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
    head: { number: number; producedAt: string };
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
  observedAt: string | null;
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  live:      { color: '#10b981', label: 'Live' },
  deploying: { color: '#f59e0b', label: 'Deploying' },
  failed:    { color: '#ef4444', label: 'Failed' },
  paused:    { color: '#6b7db3', label: 'Paused' },
  building:  { color: '#6b7db3', label: 'Building' },
};

/** The reason a row shows beside a state the Blockchain explains. */
function statusReason(net: Network): string {
  if (net.status === 'failed' && net.failureReason) return net.failureReason;
  if (net.status === 'paused' && net.unreachableReason) return net.unreachableReason;
  if (net.status === 'building') return 'This project has no deployment yet.';
  if (net.status === 'deploying') return 'Cerulea is deploying this Blueprint now.';
  return `Deployment ${net.deploymentId} answers from ${net.host ?? 'its node'}.`;
}

export default function NetworksPage() {
  const theme = useTheme();
  const reading = usePanelData<NetworksView>('/api/dashboard/networks', 10000);
  const view = reading.data;
  const loading = reading.loading && view === null;
  const failure = reading.failure;
  const networks = view?.networks ?? [];
  const now = new Date();

  const liveNets = networks.filter((n) => n.status === 'live');
  const totalTPS = liveNets.reduce((s, n) => s + (n.tps ?? 0), 0);
  const measuredNets = liveNets.filter((n) => n.consensusHealth !== null);
  const avgConsensus = measuredNets.length > 0
    ? (measuredNets.reduce((s, n) => s + (n.consensusHealth ?? 0), 0) / measuredNets.length).toFixed(1)
    : 'N/A';

  const goToStudio = () => {
    window.location.href = newProjectUrl();
  };

  const statCards = [
    { label: 'Live Networks', value: liveNets.length, color: '#10b981', icon: <NetworkCheckIcon sx={{ fontSize: 26 }} />, note: 'Deployments whose Blockchain answers now' },
    { label: 'Total Networks', value: networks.length, color: '#4F46E5', icon: <HubIcon sx={{ fontSize: 26 }} />, note: 'One per open project across every workspace' },
    { label: 'Combined TPS', value: totalTPS.toFixed(2), unit: 'tx/s', color: '#f59e0b', icon: <SpeedIcon sx={{ fontSize: 26 }} />, note: 'Transactions each second, summed across the live networks Cerulea measured' },
    { label: 'Consensus Health', value: avgConsensus, unit: avgConsensus === 'N/A' ? undefined : '%', color: '#8b5cf6', icon: <MemoryIcon sx={{ fontSize: 26 }} />, note: 'The share of validators taking part in agreement, averaged across the live networks' },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            FLEET MANAGEMENT
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>
            Networks / Fleet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Live readings from every Blockchain network this account deploys.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={goToStudio}
          sx={{ fontWeight: 700, bgcolor: 'primary.main' }}>
          Deploy New Network
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : failure && view === null ? (
        <Alert severity="error" action={<Button size="small" onClick={reading.readAgain}>Read again</Button>}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      ) : view && (
        <>
          {networks.length === 0 ? (
            <Paper variant="outlined" sx={{ borderRadius: 3, py: 12, textAlign: 'center', borderStyle: 'dashed', mb: 4 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <NetworkCheckIcon sx={{ fontSize: 36, color: '#4F46E5', opacity: 0.5 }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>No deployed networks yet</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={goToStudio} sx={{ mt: 1.5, borderRadius: 1 }}>
                Deploy the First Network
              </Button>
            </Paper>
          ) : (
            <>
              {/* Stat strip */}
              <Grid container spacing={2.5} mb={4}>
                {statCards.map((s) => (
                  <Grid key={s.label} xs={12} sm={6} md={3}>
                    <Tooltip title={s.note} placement="top">
                      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
                        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                          <Box>
                            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
                            <Stack direction="row" alignItems="baseline" spacing={0.5} mt={0.5}>
                              <Typography variant="h3" fontWeight={900} sx={{ color: s.color, lineHeight: 1 }}>{s.value}</Typography>
                              {s.unit && <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.unit}</Typography>}
                            </Stack>
                          </Box>
                          <Box sx={{ color: s.color, opacity: 0.5 }}>{s.icon}</Box>
                        </Stack>
                      </Paper>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>

              {/* Networks table */}
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 4 }}>
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HubIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>DEPLOYED NETWORKS</Typography>
                    <Chip label={networks.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }} />
                  </Stack>
                </Box>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.02) }}>
                        {['Network', 'Type', 'Status', 'Block Height', 'TPS', 'Consensus', 'Last Read', 'Region', ''].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.62rem', letterSpacing: 0.8, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {networks.map((net) => {
                        const sm = STATUS_META[net.status] ?? STATUS_META['building'];
                        const typeColor = net.type === 'Blockchain' ? '#8b5cf6' : '#4F46E5';
                        const share = net.consensusHealth;
                        const shareColor = share === null ? 'text.disabled' : share >= 99 ? '#10b981' : share >= 90 ? '#f59e0b' : '#ef4444';
                        return (
                          <TableRow key={net.id} sx={{
                            borderLeft: `3px solid ${alpha(sm.color, 0.4)}`,
                            '&:hover': { bgcolor: alpha(sm.color, 0.03) },
                          }}>
                            <TableCell>
                              <Typography variant="body2" fontWeight={700}>{net.name}</Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{net.deploymentId ?? net.workspaceName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha(typeColor, 0.1), color: typeColor, fontSize: '0.65rem', fontWeight: 700 }}>
                                {net.type}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={statusReason(net)}>
                                <Stack direction="row" alignItems="center" spacing={0.75}>
                                  <FiberManualRecordIcon sx={{ fontSize: 8, color: sm.color }} />
                                  <Typography variant="body2" fontWeight={600} sx={{ color: sm.color }}>{sm.label}</Typography>
                                </Stack>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={net.finalizedBlock !== null ? `Irreversible to block ${net.finalizedBlock.toLocaleString('en-GB')}` : 'The Blockchain answered no height'}>
                                <Typography variant="body2" fontWeight={600}>{net.blockHeight !== null ? net.blockHeight.toLocaleString('en-GB') : '—'}</Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={net.tps !== null
                                ? `The rate of the workspace Blockchain, measured across ${net.sampledBlocks} blocks at ${new Date(net.measuredAt ?? '').toLocaleTimeString()}. Cerulea APIs measures no rate per deployment yet.`
                                : 'Cerulea measured no rate for this deployment.'}>
                                <Typography variant="body2" fontWeight={600}>{net.tps !== null ? `${net.tps.toFixed(2)} tx/s` : '—'}</Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={share !== null
                                ? `${net.activeValidators} of ${net.totalValidators} validators take part in agreement. Agreement ${net.consensusState}.`
                                : 'The Blockchain answered no validator count.'}>
                                <Typography variant="body2" fontWeight={600} sx={{ color: shareColor }}>
                                  {share !== null ? `${share.toFixed(1)}%` : '—'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={net.status === 'live' ? 'When Cerulea last read the height from this Blockchain' : 'No Blockchain answers for this row'}>
                                <Typography variant="body2" color="text.secondary">
                                  {net.status === 'live' ? relativeTime(view.observedAt, now) : '—'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">{net.region ?? '—'}</Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title={net.host ? 'Open the Explorer of the chain this deployment runs on' : 'Open the project in Studio'}>
                                <Button size="small" variant="outlined" sx={{ borderRadius: 1, fontSize: '0.68rem' }}
                                  aria-label={`View ${net.name}`}
                                  onClick={() => {
                                    openInNewTab(net.host ? explorerUrl(net.division) : openProjectUrl(net.id, net.division));
                                  }}>
                                  View
                                </Button>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {/* The node Studio is joined to */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mb: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>THE NODE STUDIO READS</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{view.chain.node.chainName}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={view.chain.healthy ? 'Serving' : 'Needs attention'} color={view.chain.healthy ? 'success' : 'warning'} />
                <Chip size="small" label={`Agreement ${view.chain.consensusHealth}`} />
                <Chip size="small" label={view.chain.node.isSyncing ? 'Catching up' : 'In step'} />
              </Stack>
            </Stack>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
              <Box>
                <Typography variant="caption" color="text.secondary">Node software</Typography>
                <Typography variant="body2">{view.chain.node.systemName} {view.chain.node.systemVersion}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Newest block</Typography>
                <Typography variant="body2">{view.chain.head.number}, irreversible to {view.chain.finalizedBlock}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Epoch and round</Typography>
                <Typography variant="body2">Epoch {view.chain.epoch}, round {view.chain.round}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Validator set</Typography>
                <Typography variant="body2">Set {view.chain.validatorSetId}, {view.chain.activeValidators} of {view.chain.totalValidators} serving</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Peers</Typography>
                <Typography variant="body2">
                  {view.chain.node.peers}{view.chain.node.shouldHavePeers ? '' : ' (runs alone by design)'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Read at</Typography>
                <Typography variant="body2">{new Date(view.chain.node.observedAt).toLocaleTimeString()}</Typography>
              </Box>
            </Stack>
            {view.chain.issues.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Open items</Typography>
                {view.chain.issues.map((issue) => (
                  <Typography key={issue} variant="body2" color="text.secondary">{issue}</Typography>
                ))}
              </Box>
            )}
          </Paper>

          {/* Measured behaviour */}
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Measured behaviour</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We measured blocks {view.measurement.firstBlock} to {view.measurement.lastBlock} of {view.chain.node.chainName}. Every figure below comes from those blocks.
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 220 }}>
                <Typography variant="overline" color="text.secondary">Transactions each second</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{view.measurement.transactionsPerSecond.toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Across {view.measurement.sampledBlocks} blocks carrying {view.measurement.transactions} transactions.
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 220 }}>
                <Typography variant="overline" color="text.secondary">Seconds between blocks</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{view.measurement.meanBlockSeconds.toFixed(2)}</Typography>
                <Typography variant="caption" color="text.secondary">
                  The mean gap across the sample. A widening gap slows every confirmation.
                </Typography>
              </Paper>
            </Stack>
          </Paper>
        </>
      )}
    </Box>
  );
}
