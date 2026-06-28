'use client';

import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha, useTheme } from '@mui/material/styles';
import { useSession } from 'next-auth/react';
import AddIcon from '@mui/icons-material/Add';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import HubIcon from '@mui/icons-material/Hub';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

type Network = {
  id: string;
  name: string;
  type: 'L1' | 'dApp';
  status: 'live' | 'deploying' | 'paused';
  blockHeight: number;
  tps: number;
  lastBlock: string;
  region: string;
  consensusHealth: number;
};

const TEST_NETWORKS: Network[] = [
  { id: 'net-001', name: 'CeruleaChain Mainnet', type: 'L1', status: 'live', blockHeight: 4_182_034, tps: 142, lastBlock: '2 sec ago', region: 'us-east-1', consensusHealth: 99.8 },
  { id: 'net-002', name: 'VoteApp Devnet', type: 'dApp', status: 'live', blockHeight: 98_201, tps: 8, lastBlock: '11 sec ago', region: 'eu-west-1', consensusHealth: 100 },
  { id: 'net-003', name: 'SupplyChain Staging', type: 'dApp', status: 'deploying', blockHeight: 0, tps: 0, lastBlock: 'N/A', region: 'ap-southeast-1', consensusHealth: 0 },
  { id: 'net-004', name: 'TradeFi Private L1', type: 'L1', status: 'live', blockHeight: 1_045_892, tps: 67, lastBlock: '5 sec ago', region: 'eu-central-1', consensusHealth: 98.4 },
  { id: 'net-005', name: 'NFT Marketplace Chain', type: 'dApp', status: 'live', blockHeight: 312_801, tps: 23, lastBlock: '8 sec ago', region: 'us-west-2', consensusHealth: 99.1 },
  { id: 'net-006', name: 'CBDC Pilot Network', type: 'L1', status: 'paused', blockHeight: 78_100, tps: 0, lastBlock: '3 days ago', region: 'ap-northeast-1', consensusHealth: 0 },
];

const STATUS_META: Record<string, { color: string; label: string }> = {
  live: { color: '#10b981', label: 'Live' },
  deploying: { color: '#f59e0b', label: 'Deploying' },
  paused: { color: '#6b7db3', label: 'Paused' },
};

type Project = { id: string; name: string; projectType: string; status: string };

export default function NetworksPage() {
  const theme = useTheme();
  const { data: session } = useSession();
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);

  const isTestAccount = session?.user?.email === 'test@cerulea.app';

  useEffect(() => {
    if (!session) return;
    if (isTestAccount) { setNetworks(TEST_NETWORKS); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) { setLoading(false); return; }
        const j = await res.json();
        const userProjects: Project[] = j.projects || [];
        const derived: Network[] = userProjects
          .filter((p) => p.status === 'active' || p.status === 'deploying')
          .map((p, i) => ({
            id: `net-${p.id}`, name: p.name, type: p.projectType === 'blockchain' ? 'L1' : 'dApp',
            status: p.status === 'active' ? 'live' : 'deploying',
            blockHeight: p.status === 'active' ? Math.floor(Math.random() * 100_000) + 1000 : 0,
            tps: p.status === 'active' ? Math.floor(Math.random() * 30) + 1 : 0,
            lastBlock: p.status === 'active' ? `${i * 3 + 2} sec ago` : 'N/A',
            region: ['us-east-1', 'eu-west-1', 'ap-southeast-1'][i % 3],
            consensusHealth: p.status === 'active' ? 99.0 + Math.random() * 0.9 : 0,
          }));
        setNetworks(derived);
      } catch {} finally { setLoading(false); }
    })();
  }, [session, isTestAccount]);

  const liveNets = networks.filter((n) => n.status === 'live');
  const totalTPS = liveNets.reduce((s, n) => s + n.tps, 0);
  const avgConsensus = liveNets.length > 0
    ? (liveNets.reduce((s, n) => s + n.consensusHealth, 0) / liveNets.length).toFixed(1)
    : 'N/A';

  const goToStudio = () => {
    const isLocal = window.location.hostname.includes('localhost');
    window.location.href = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
  };

  const statCards = [
    { label: 'Live Networks', value: liveNets.length, color: '#10b981', icon: <NetworkCheckIcon sx={{ fontSize: 26 }} /> },
    { label: 'Total Networks', value: networks.length, color: '#4F46E5', icon: <HubIcon sx={{ fontSize: 26 }} /> },
    { label: 'Combined TPS', value: `${totalTPS}`, unit: 'tx/s', color: '#f59e0b', icon: <SpeedIcon sx={{ fontSize: 26 }} /> },
    { label: 'Consensus Health', value: avgConsensus, unit: '%', color: '#8b5cf6', icon: <MemoryIcon sx={{ fontSize: 26 }} /> },
  ];

  return (
    <Box sx={{ p: 4, maxWidth: 1200 }}>
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
            Real-time telemetry across all your deployed blockchain networks.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={goToStudio}
          sx={{ fontWeight: 700, bgcolor: 'primary.main' }}>
          Deploy New Network
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
      ) : networks.length === 0 ? (
        <Paper variant="outlined" sx={{ borderRadius: 3, py: 12, textAlign: 'center', borderStyle: 'dashed' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: 3, bgcolor: alpha('#4F46E5', 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
            <NetworkCheckIcon sx={{ fontSize: 36, color: '#4F46E5', opacity: 0.5 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>No deployed networks yet</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={goToStudio} sx={{ mt: 1.5, borderRadius: 1 }}>
            Deploy Your First Network
          </Button>
        </Paper>
      ) : (
        <>
          {/* Stat strip */}
          <Grid container spacing={2.5} mb={4}>
            {statCards.map((s) => (
              <Grid key={s.label} xs={12} sm={6} md={3}>
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
              </Grid>
            ))}
          </Grid>

          {/* Networks table */}
          <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
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
                    {['Network', 'Type', 'Status', 'Block Height', 'TPS', 'Consensus', 'Last Block', 'Region', ''].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.62rem', letterSpacing: 0.8, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {networks.map((net) => {
                    const sm = STATUS_META[net.status];
                    const typeColor = net.type === 'L1' ? '#8b5cf6' : '#4F46E5';
                    return (
                      <TableRow key={net.id} sx={{
                        borderLeft: `3px solid ${alpha(sm.color, 0.4)}`,
                        '&:hover': { bgcolor: alpha(sm.color, 0.03) },
                      }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{net.name}</Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace', fontSize: '0.65rem' }}>{net.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1.5, bgcolor: alpha(typeColor, 0.1), color: typeColor, fontSize: '0.65rem', fontWeight: 700 }}>
                            {net.type}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={0.75}>
                            <FiberManualRecordIcon sx={{ fontSize: 8, color: sm.color }} />
                            <Typography variant="body2" fontWeight={600} sx={{ color: sm.color }}>{sm.label}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{net.blockHeight > 0 ? net.blockHeight.toLocaleString() : '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{net.tps > 0 ? `${net.tps} tx/s` : '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}
                            sx={{ color: net.consensusHealth >= 99 ? '#10b981' : net.consensusHealth >= 90 ? '#f59e0b' : net.consensusHealth > 0 ? '#ef4444' : 'text.disabled' }}>
                            {net.consensusHealth > 0 ? `${net.consensusHealth.toFixed(1)}%` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{net.lastBlock}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{net.region}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" disabled={net.status !== 'live'} sx={{ borderRadius: 1, fontSize: '0.68rem' }}>
                            View
                          </Button>
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
