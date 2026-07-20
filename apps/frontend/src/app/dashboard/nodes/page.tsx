'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, LinearProgress, CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import ShieldIcon from '@mui/icons-material/Shield';
import HubIcon from '@mui/icons-material/Hub';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import DnsIcon from '@mui/icons-material/Dns';

type Node = {
  id: string;
  role: 'Validator' | 'RPC' | 'Archival';
  status: 'Active' | 'Down' | 'Syncing';
  region: string;
  uptime: number;
  network: string;
  cpuPct: number;
  memPct: number;
};

const TEST_NODES: Node[] = [
  { id: 'node-val-01', role: 'Validator', status: 'Active',  region: 'us-east-1',      uptime: 99.94, network: 'CeruleaChain Mainnet',  cpuPct: 34, memPct: 51 },
  { id: 'node-val-02', role: 'Validator', status: 'Active',  region: 'eu-west-1',      uptime: 99.81, network: 'CeruleaChain Mainnet',  cpuPct: 29, memPct: 48 },
  { id: 'node-val-03', role: 'Validator', status: 'Down',    region: 'ap-southeast-1', uptime: 71.2,  network: 'CeruleaChain Mainnet',  cpuPct: 0,  memPct: 0 },
  { id: 'node-val-04', role: 'Validator', status: 'Active',  region: 'eu-central-1',   uptime: 100,   network: 'TradeFi Private L1',    cpuPct: 22, memPct: 44 },
  { id: 'node-val-05', role: 'Validator', status: 'Active',  region: 'us-west-2',      uptime: 99.97, network: 'TradeFi Private L1',    cpuPct: 27, memPct: 46 },
  { id: 'node-rpc-01', role: 'RPC',       status: 'Active',  region: 'us-east-1',      uptime: 100,   network: 'VoteApp Devnet',         cpuPct: 18, memPct: 38 },
  { id: 'node-rpc-02', role: 'RPC',       status: 'Active',  region: 'eu-west-1',      uptime: 99.99, network: 'VoteApp Devnet',         cpuPct: 21, memPct: 40 },
  { id: 'node-rpc-03', role: 'RPC',       status: 'Syncing', region: 'ap-northeast-1', uptime: 98.1,  network: 'NFT Marketplace Chain', cpuPct: 55, memPct: 67 },
  { id: 'node-arc-01', role: 'Archival',  status: 'Active',  region: 'us-west-2',      uptime: 99.55, network: 'CeruleaChain Mainnet',  cpuPct: 12, memPct: 72 },
  { id: 'node-arc-02', role: 'Archival',  status: 'Active',  region: 'eu-west-2',      uptime: 99.8,  network: 'TradeFi Private L1',    cpuPct: 9,  memPct: 68 },
];

const ROLE_COLOR: Record<string, string> = { Validator: '#8b5cf6', RPC: '#4F46E5', Archival: '#06b6d4' };
const STATUS_COLOR: Record<string, string> = { Active: '#10b981', Down: '#ef4444', Syncing: '#f59e0b' };

export default function NodesPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  const isTestAccount = session?.user?.email === 'test@cerulea.app';

  useEffect(() => {
    if (!session) return;
    if (isTestAccount) { setNodes(TEST_NODES); setLoading(false); return; }
    // Nodes map 1:1 with projects — no real node metrics until infrastructure is provisioned.
    fetch('/api/projects')
      .then(r => r.json())
      .then(j => {
        const userProjects = (j.projects || []);
        const derived: Node[] = userProjects.map((p: any) => ({
          id: p.id,
          role: 'Validator' as const,
          status: p.status === 'active' ? 'Active' as const : 'Syncing' as const,
          region: '—',
          uptime: 0,
          network: p.name,
          cpuPct: 0,
          memPct: 0,
        }));
        setNodes(derived);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, isTestAccount]);

  const activeNodes = nodes.filter((n) => n.status === 'Active');
  const downNodes = nodes.filter((n) => n.status === 'Down');
  const validators = nodes.filter((n) => n.role === 'Validator');
  const activeValidators = validators.filter((n) => n.status === 'Active');
  const faultTolerance = validators.length ? Math.floor((activeValidators.length / validators.length) * 100) : 0;

  const statCards = [
    { label: 'Total Nodes', value: nodes.length, sub: 'Across all networks', color: '#4F46E5', icon: <HubIcon sx={{ fontSize: 28 }} /> },
    { label: 'Active', value: activeNodes.length, sub: 'Healthy & reachable', color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 28 }} /> },
    { label: 'Down / Degraded', value: downNodes.length, sub: 'Require attention', color: '#ef4444', icon: <ErrorIcon sx={{ fontSize: 28 }} /> },
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
            Monitor validators, RPC endpoints, and archival nodes across all your networks.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Available after deployment" arrow>
            <span>
              <Button variant="contained" disabled sx={{ fontWeight: 700 }}>Provision Node</Button>
            </span>
          </Tooltip>
          <Button variant="outlined" startIcon={<VpnKeyIcon />} sx={{ borderRadius: 1, fontWeight: 700 }}>Rotate Keys</Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : nodes.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, py: 12, textAlign: 'center', borderStyle: 'dashed' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <DnsIcon sx={{ fontSize: 36, color: '#4F46E5', opacity: 0.5 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>No nodes provisioned yet</Typography>
          <Typography variant="caption" color="text.secondary">Nodes are automatically provisioned when you deploy a network.</Typography>
        </Paper>
      ) : (
        <>
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
                <LinearProgress variant="determinate" value={faultTolerance}
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
              </Stack>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.02) }}>
                    {['Node ID', 'Network', 'Role', 'Status', 'Region', 'CPU', 'Memory', 'Uptime', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.62rem', letterSpacing: 0.8, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodes.map((node) => {
                    const sc = STATUS_COLOR[node.status];
                    const rc = ROLE_COLOR[node.role];
                    return (
                      <TableRow key={node.id} sx={{
                        borderLeft: `3px solid ${alpha(sc, 0.4)}`,
                        '&:hover': { bgcolor: alpha(sc, 0.03) },
                      }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{node.id}</Typography>
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
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: sc, flexShrink: 0 }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: sc }}>{node.status}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{node.region}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={700} sx={{ color: node.cpuPct > 80 ? '#ef4444' : node.cpuPct > 60 ? '#f59e0b' : 'text.secondary' }}>
                            {node.status === 'Down' ? '—' : `${node.cpuPct}%`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={700} sx={{ color: node.memPct > 85 ? '#ef4444' : node.memPct > 70 ? '#f59e0b' : 'text.secondary' }}>
                            {node.status === 'Down' ? '—' : `${node.memPct}%`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ minWidth: 90 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: node.uptime >= 99 ? '#10b981' : node.uptime >= 90 ? '#f59e0b' : '#ef4444' }}>
                              {node.uptime.toFixed(2)}%
                            </Typography>
                            <LinearProgress variant="determinate" value={node.uptime}
                              sx={{ mt: 0.5, borderRadius: 1, height: 4, bgcolor: alpha('#10b981', 0.12), '& .MuiLinearProgress-bar': { bgcolor: node.uptime >= 99 ? '#10b981' : node.uptime >= 90 ? '#f59e0b' : '#ef4444' } }} />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.75}>
                            <Tooltip title="Available after deployment" arrow>
                              <span><Button size="small" variant="outlined" disabled sx={{ borderRadius: 1, fontSize: '0.68rem' }}>SSH</Button></span>
                            </Tooltip>
                            <Button size="small" variant="outlined" startIcon={<VpnKeyIcon sx={{ fontSize: 11 }} />} sx={{ borderRadius: 1, fontSize: '0.68rem' }}>Rotate</Button>
                          </Stack>
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
