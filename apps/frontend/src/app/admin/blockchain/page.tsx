'use client';

// apps/frontend/src/app/admin/blockchain/page.tsx
// The Blockchain Projects screen of the Cerulea operator.
// The project cards come from /api/admin/projects?type=blockchain. The figures
// on a deployed card and the validator table come from /api/admin/chain, which
// reads the node, the newest blocks and every validator through Cerulea APIs.
// A project with no deployment yet shows no figure, because no node runs it.
// Without this screen the operator cannot judge the state of the network.

import {
  Box, Typography, Paper, Stack, Chip, CircularProgress, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, LinearProgress,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

import { participationPercent, shortAccount } from '@/components/dashboard/wording';

import { FailureLine, HeadCell, longDate, useOperatorRead } from '../_shared/operator';

type BlockchainProject = {
  id: string;
  name: string;
  status: string;
  state: string;
  deployments: number;
  workspaceName: string;
  ownerEmail: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
};

type ChainReading = {
  network: {
    node: { systemName: string; systemVersion: string; chainName: string; kind: 'local' | 'live'; peers: number };
    head: { number: number };
    finalizedBlock: number;
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
    measuredAt: string;
  };
  validators: {
    profile: { account: string; state: string; authoredBlocks: number; missedBlocks: number };
    trust: { total: number; standing: number; performance: number; custody: number; verification: number };
  }[];
};

const HEALTH_COLOR: Record<string, string> = {
  Healthy: '#4caf50',
  Degraded: '#ff9800',
  Critical: '#f44336',
};

/** A project runs on a node once Cerulea deployed it. */
function isDeployed(project: BlockchainProject): boolean {
  return project.state === 'deployed' || project.deployments > 0;
}

export default function AdminBlockchainPage() {
  const held = useOperatorRead<{ projects: BlockchainProject[] }>('/api/admin/projects?type=blockchain');
  const chain = useOperatorRead<ChainReading>('/api/admin/chain');
  const projects = held.data?.projects ?? [];
  const network = chain.data?.network;
  const measurement = chain.data?.measurement;
  const validators = chain.data?.validators ?? [];
  const loading = held.loading || chain.loading;

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
        <HexagonOutlinedIcon sx={{ color: '#ce93d8', fontSize: 22 }} />
        <Typography variant="h4" fontWeight={900}>Blockchain Projects</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
        Every Blockchain project created on Cerulea Studio. The figures on a deployed card come from the node that runs it.
      </Typography>

      {held.error && <Box mb={3}><FailureLine message={held.error} /></Box>}
      {chain.error && <Box mb={3}><FailureLine message={chain.error} /></Box>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress size={32} /></Box>
      ) : !held.error && projects.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center', borderColor: 'rgba(255,255,255,0.07)', mb: 4 }}>
          <HexagonOutlinedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>No blockchain projects yet</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>Blockchain projects created in Studio will appear here.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3} mb={4}>
          {projects.map((proj) => {
            const deployed = isDeployed(proj) && network !== undefined && measurement !== undefined;
            const values = deployed
              ? [
                  { label: 'Block Height', value: network.head.number.toLocaleString() },
                  { label: 'TPS', value: measurement.transactionsPerSecond.toString() },
                  { label: 'Validators', value: `${network.activeValidators} / ${network.totalValidators}` },
                  { label: 'Consensus Health', value: network.consensusHealth, color: HEALTH_COLOR[network.consensusHealth] },
                ]
              : [
                  { label: 'Block Height', value: 'awaiting deployment' },
                  { label: 'TPS', value: 'awaiting deployment' },
                  { label: 'Validators', value: 'awaiting deployment' },
                  { label: 'Consensus Health', value: 'awaiting deployment' },
                ];
            return (
              <Grid key={proj.id} xs={12} md={6} lg={4}>
                <Paper variant="outlined" data-testid="chain-card" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha('#ce93d8', 0.15), background: alpha('#ce93d8', 0.03) }}>
                  <Stack sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha('#ce93d8', 0.1)}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                      <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem', color: '#ce93d8' }}>{proj.name}</Typography>
                      <Chip
                        label={proj.status}
                        size="small"
                        sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: proj.status === 'active' ? alpha('#4caf50', 0.12) : alpha('#ffffff', 0.07), color: proj.status === 'active' ? '#4caf50' : 'rgba(255,255,255,0.45)', border: 'none', textTransform: 'capitalize' }}
                      />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {proj.ownerName ?? proj.ownerEmail ?? `workspace ${proj.workspaceName}`}
                    </Typography>
                  </Stack>
                  <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />} sx={{ px: 3, py: 1.5 }} spacing={0}>
                    {values.map(({ label, value, color }) => (
                      <Stack key={label} direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{label}</Typography>
                        <Typography variant="caption" sx={{ color: color ?? (deployed ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)'), fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: deployed ? 700 : 400 }}>{value}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 3, pb: 2, opacity: 0.4 }}>
                    <AccessTimeIcon sx={{ fontSize: 11 }} />
                    <Typography variant="caption" sx={{ fontSize: '0.67rem' }}>
                      Created {longDate(proj.createdAt)}
                      {deployed ? ` on ${network.node.chainName}` : ''}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Validators */}
      {!chain.loading && !chain.error && network && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.07)' }}>
          <Stack direction="row" alignItems="center" sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }} spacing={1.5}>
            <Box>
              <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>Validators on {network.node.chainName}</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
                The Trust Score of each validator and its four parts: standing, performance, custody and verification.
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <Chip size="small" label={`${network.node.kind} node`} sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: 'none', textTransform: 'uppercase' }} />
            <Chip size="small" label={network.consensusHealth} sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: alpha(HEALTH_COLOR[network.consensusHealth], 0.12), color: HEALTH_COLOR[network.consensusHealth], border: 'none' }} />
          </Stack>
          {validators.length === 0 ? (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.35)' }}>No validator answers yet. Start a validator process and join it to this network.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <HeadCell label="Validator" />
                    <HeadCell label="State" />
                    <HeadCell label="Trust Score" align="right" />
                    <HeadCell label="Standing" align="right" />
                    <HeadCell label="Performance" align="right" />
                    <HeadCell label="Custody" align="right" />
                    <HeadCell label="Verification" align="right" />
                    <HeadCell label="Turns taken" align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validators.map((entry) => {
                    const share = participationPercent(entry.profile.authoredBlocks, entry.profile.missedBlocks);
                    return (
                      <TableRow key={entry.profile.account} sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' } }}>
                        <TableCell>
                          <Tooltip title={entry.profile.account}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.76rem' }}>{shortAccount(entry.profile.account)}</Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={entry.profile.state} sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: entry.profile.state === 'Active' ? alpha('#4caf50', 0.12) : alpha('#ffffff', 0.07), color: entry.profile.state === 'Active' ? '#4caf50' : 'rgba(255,255,255,0.45)', border: 'none' }} />
                        </TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 800, color: '#ce93d8' }}>{entry.trust.total}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{entry.trust.standing}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{entry.trust.performance}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{entry.trust.custody}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{entry.trust.verification}</Typography></TableCell>
                        <TableCell align="right" sx={{ width: 160 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress variant="determinate" value={share} sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: '#ce93d8', borderRadius: 3 } }} />
                            <Typography variant="caption" sx={{ fontSize: '0.7rem', minWidth: 32, textAlign: 'right' }}>{share}%</Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </Box>
  );
}
