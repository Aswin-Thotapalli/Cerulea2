'use client';

// apps/frontend/src/app/dashboard/nodes/page.tsx
// The Nodes screen.
// Every row reads /api/dashboard/nodes: the node Studio is joined to, every
// validator taking part in agreement with its Trust Score, and every node a
// deployment runs with the memory, processor time and uptime the hosting
// process measured. A figure Cerulea APIs holds no reading for says so.
// Without this screen an operator cannot tell who is authoring blocks.

import {
  Box, Typography, Paper, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, LinearProgress, CircularProgress, Alert, AlertTitle, Button,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ShieldIcon from '@mui/icons-material/Shield';
import HubIcon from '@mui/icons-material/Hub';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import DnsIcon from '@mui/icons-material/Dns';

import { usePanelData } from '@/components/dashboard/PanelState';
import { shortAccount } from '@/components/dashboard/wording';
import { durationText } from '@/components/dashboard/time';

/** The answer of /api/dashboard/nodes, exactly as the route writes it. */
type NodesView = {
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
    head: { number: number };
    finalizedBlock: number;
    epoch: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
  };
  validators: {
    profile: {
      account: string;
      standingScore: number;
      trustScore: number;
      state: 'Active' | 'Inactive' | 'Slashed';
      authoredBlocks: number;
      missedBlocks: number;
    };
    trust: {
      total: number;
      standing: number;
      performance: number;
      custody: number;
      verification: number;
    };
  }[];
  nodes: {
    nodeId: string;
    deploymentId: string;
    projectName: string;
    account: string;
    kind: 'process' | 'in_process';
    state: 'running' | 'stopped';
    systemName: string | null;
    systemVersion: string | null;
    chainName: string | null;
    height: number | null;
    peers: number | null;
    expectedPeers: number;
    isSyncing: boolean | null;
    resources: {
      source: 'hosting_service' | 'node_process';
      residentBytes: number | null;
      processorSeconds: number | null;
      uptimeSeconds: number | null;
    };
    startedAt: string | null;
    workspaceName: string;
    region: string | null;
  }[];
  observedAt: string;
};

type Role = 'Node' | 'Validator';
type Status = 'Active' | 'Down' | 'Degraded' | 'Syncing';

/** One roster row, whatever kind of node it describes. */
type RosterRow = {
  key: string;
  id: string;
  idDetail: string;
  network: string;
  role: Role;
  status: Status;
  statusDetail: string;
  region: string;
  cpu: string;
  cpuDetail: string;
  memory: string;
  memoryDetail: string;
  uptime: string;
  uptimeDetail: string;
  trust: { total: number; standing: number; performance: number; custody: number; verification: number } | null;
};

const ROLE_COLOR: Record<Role, string> = { Validator: '#8b5cf6', Node: '#4F46E5' };
const STATUS_COLOR: Record<Status, string> = { Active: '#10b981', Down: '#ef4444', Degraded: '#f59e0b', Syncing: '#f59e0b' };

const UNMEASURED = 'unmeasured';

function megabytes(bytes: number | null): string {
  if (bytes === null) return UNMEASURED;
  return `${(bytes / 1048576).toFixed(0)} MB`;
}

/** The share of wall time the process spent on the processor, as a whole percentage. */
function processorShare(processorSeconds: number | null, uptimeSeconds: number | null): string {
  if (processorSeconds === null || uptimeSeconds === null || uptimeSeconds <= 0) return UNMEASURED;
  return `${Math.round((processorSeconds / uptimeSeconds) * 100)}%`;
}

/** Builds the roster from the three kinds of node the route answers. */
function rosterOf(view: NodesView): RosterRow[] {
  const node = view.network.node;
  const rows: RosterRow[] = [
    {
      key: `node-${node.systemName}`,
      id: node.systemName,
      idDetail: `${node.systemName} ${node.systemVersion}, the node Studio reads. ${node.peers} peers.`,
      network: node.chainName,
      role: 'Node',
      status: node.isSyncing ? 'Syncing' : 'Active',
      statusDetail: node.isSyncing
        ? 'The node is catching up with the chain.'
        : `The node answers at block ${view.network.head.number}, irreversible to ${view.network.finalizedBlock}.`,
      region: node.kind,
      cpu: UNMEASURED,
      cpuDetail: 'Cerulea APIs measures no processor time for the node it reads.',
      memory: UNMEASURED,
      memoryDetail: 'Cerulea APIs measures no memory for the node it reads.',
      uptime: UNMEASURED,
      uptimeDetail: 'Cerulea APIs measures no uptime for the node it reads.',
      trust: null,
    },
  ];
  for (const entry of view.nodes) {
    const measuredOn = entry.resources.source === 'hosting_service'
      ? 'Measured on the Cerulea APIs process that hosts this node.'
      : 'Measured on the node process.';
    rows.push({
      key: entry.nodeId,
      id: entry.account,
      idDetail: `${entry.nodeId}. ${entry.kind === 'in_process' ? 'Runs inside Cerulea APIs' : 'Runs as its own process'} for deployment ${entry.deploymentId}.`,
      network: entry.projectName,
      role: 'Validator',
      status: entry.state === 'running' ? (entry.isSyncing ? 'Syncing' : 'Active') : 'Down',
      statusDetail: entry.state === 'running'
        ? `Running at block ${entry.height ?? 'unknown'} with ${entry.peers ?? 0} of ${entry.expectedPeers} expected peers.`
        : 'The node process stopped.',
      region: entry.region ?? UNMEASURED,
      cpu: processorShare(entry.resources.processorSeconds, entry.resources.uptimeSeconds),
      cpuDetail: entry.resources.processorSeconds !== null
        ? `${entry.resources.processorSeconds.toFixed(0)} s of processor time over ${durationText(entry.resources.uptimeSeconds)}. ${measuredOn}`
        : 'Cerulea APIs holds no processor reading for this node.',
      memory: megabytes(entry.resources.residentBytes),
      memoryDetail: entry.resources.residentBytes !== null
        ? `Resident memory. ${measuredOn}`
        : 'Cerulea APIs holds no memory reading for this node.',
      uptime: durationText(entry.resources.uptimeSeconds),
      uptimeDetail: entry.startedAt
        ? `Started ${new Date(entry.startedAt).toLocaleString()}. ${measuredOn}`
        : measuredOn,
      trust: null,
    });
  }
  for (const entry of view.validators) {
    rows.push({
      key: `validator-${entry.profile.account}`,
      id: shortAccount(entry.profile.account),
      idDetail: entry.profile.account,
      network: node.chainName,
      role: 'Validator',
      status: entry.profile.state === 'Active' ? 'Active' : entry.profile.state === 'Slashed' ? 'Down' : 'Degraded',
      statusDetail: `${entry.profile.state}. Authored ${entry.profile.authoredBlocks} blocks, missed ${entry.profile.missedBlocks}.`,
      region: UNMEASURED,
      cpu: UNMEASURED,
      cpuDetail: 'A validator reports its blocks, its standing and its Trust Score. Its processor stays unmeasured here.',
      memory: UNMEASURED,
      memoryDetail: 'A validator reports its blocks, its standing and its Trust Score. Its memory stays unmeasured here.',
      uptime: UNMEASURED,
      uptimeDetail: 'A validator reports its blocks, its standing and its Trust Score. Its uptime stays unmeasured here.',
      trust: entry.trust,
    });
  }
  return rows;
}

export default function NodesPage() {
  const theme = useTheme();
  const reading = usePanelData<NodesView>('/api/dashboard/nodes', 12000);
  const view = reading.data;
  const loading = reading.loading && view === null;
  const failure = reading.failure;

  const nodes = view ? rosterOf(view) : [];
  const activeNodes = nodes.filter((n) => n.status === 'Active');
  const downNodes = nodes.filter((n) => n.status === 'Down' || n.status === 'Degraded');
  const validators = nodes.filter((n) => n.role === 'Validator');
  const activeValidators = validators.filter((n) => n.status === 'Active');
  const faultTolerance = validators.length ? Math.floor((activeValidators.length / validators.length) * 100) : 0;
  const deploymentsRunNodes = Boolean(view && (view.nodes.length > 0 || view.validators.length > 0));

  const statCards = [
    { label: 'Total Nodes', value: nodes.length, sub: 'Across every network', color: '#4F46E5', icon: <HubIcon sx={{ fontSize: 28 }} /> },
    { label: 'Active', value: activeNodes.length, sub: 'Answering and in step', color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 28 }} /> },
    { label: 'Down / Degraded', value: downNodes.length, sub: 'Need attention', color: '#ef4444', icon: <ErrorIcon sx={{ fontSize: 28 }} /> },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>
            INFRASTRUCTURE
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>
            Nodes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Every validator and every node that serves the networks of this account.
          </Typography>
        </Box>
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
          {!deploymentsRunNodes && (
            <Paper variant="outlined" sx={{ borderRadius: 3, py: 8, textAlign: 'center', borderStyle: 'dashed', mb: 4 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <DnsIcon sx={{ fontSize: 36, color: '#4F46E5', opacity: 0.5 }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>No deployment runs a node yet</Typography>
              <Typography variant="caption" color="text.secondary">Cerulea starts the nodes when we deploy a network. The node Studio reads is listed below.</Typography>
            </Paper>
          )}

          {/* Stat cards */}
          <Grid container spacing={2.5} mb={4}>
            {statCards.map((s) => (
              <Grid key={s.label} xs={12} sm={6} md={3}>
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
                      <Typography variant="h3" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>{s.value}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{s.sub}</Typography>
                    </Box>
                    <Box sx={{ color: s.color, opacity: 0.5 }}>{s.icon}</Box>
                  </Stack>
                </Paper>
              </Grid>
            ))}
            <Grid xs={12} sm={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha('#f59e0b', 0.05), borderColor: alpha('#f59e0b', 0.18) }}>
                <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>FAULT TOLERANCE</Typography>
                <Typography variant="h3" fontWeight={900} sx={{ color: '#f59e0b', lineHeight: 1, mt: 0.5 }}>{faultTolerance}%</Typography>
                <LinearProgress variant="determinate" value={faultTolerance} aria-label="Share of validators active"
                  sx={{ mt: 1.5, mb: 0.75, borderRadius: 1, height: 6, bgcolor: alpha('#f59e0b', 0.15), '& .MuiLinearProgress-bar': { bgcolor: faultTolerance >= 90 ? '#10b981' : faultTolerance >= 66 ? '#f59e0b' : '#ef4444' } }} />
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <ShieldIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">{activeValidators.length}/{validators.length} validators active</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Node table */}
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <DeviceHubIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>NODE ROSTER</Typography>
                  <Chip label={nodes.length} size="small" sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', border: 'none' }} />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Read at {new Date(view.observedAt).toLocaleTimeString()}. The Trust Score decides how often a validator authors a block.
                </Typography>
              </Stack>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.02) }}>
                    {['Node ID', 'Network', 'Role', 'Status', 'Region', 'CPU', 'Memory', 'Uptime', 'Trust Score'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.62rem', letterSpacing: 0.8, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodes.map((node) => {
                    const sc = STATUS_COLOR[node.status];
                    const rc = ROLE_COLOR[node.role];
                    return (
                      <TableRow key={node.key} sx={{
                        borderLeft: `3px solid ${alpha(sc, 0.4)}`,
                        '&:hover': { bgcolor: alpha(sc, 0.03) },
                      }}>
                        <TableCell>
                          <Tooltip title={node.idDetail}>
                            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{node.id}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{node.network}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha(rc, 0.1), color: rc, fontSize: '0.65rem', fontWeight: 700 }}>
                            {node.role}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={node.statusDetail}>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: sc, flexShrink: 0 }} />
                              <Typography variant="body2" fontWeight={600} sx={{ color: sc }}>{node.status}</Typography>
                            </Stack>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{node.region}</Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={node.cpuDetail}>
                            <Typography variant="caption" fontWeight={700} color={node.cpu === UNMEASURED ? 'text.disabled' : 'text.secondary'}>{node.cpu}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={node.memoryDetail}>
                            <Typography variant="caption" fontWeight={700} color={node.memory === UNMEASURED ? 'text.disabled' : 'text.secondary'}>{node.memory}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Tooltip title={node.uptimeDetail}>
                            <Typography variant="caption" fontWeight={700} color={node.uptime === UNMEASURED ? 'text.disabled' : 'text.secondary'}>{node.uptime}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          {node.trust ? (
                            <Tooltip title={`Standing ${node.trust.standing}, performance ${node.trust.performance}, custody ${node.trust.custody}, verification ${node.trust.verification}`}>
                              <Typography variant="caption" fontWeight={700} sx={{ color: '#8b5cf6' }}>{node.trust.total}</Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.disabled">—</Typography>
                          )}
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
    </Box>
  );
}
