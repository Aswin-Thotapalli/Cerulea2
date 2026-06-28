'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, LinearProgress, CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PendingIcon from '@mui/icons-material/Pending';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import GavelIcon from '@mui/icons-material/Gavel';
import Link from 'next/link';

type Proposal = {
  id: string;
  title: string;
  description: string;
  votesFor: number;
  votesAgainst: number;
  deadline: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
};

type MultiSigTx = {
  id: string;
  to: string;
  value: string;
  description: string;
  threshold: number;
  approvals: number;
  status: 'pending' | 'executed' | 'cancelled';
};

type HistoryEntry = {
  id: string;
  proposal: string;
  vote: 'For' | 'Against' | 'Abstain';
  date: string;
  result: string;
};

const STUB_PROPOSALS: Proposal[] = [
  { id: 'prop-001', title: 'Increase block gas limit to 30M', description: 'Raise the gas limit per block to improve throughput on high-load periods.', votesFor: 7812, votesAgainst: 1204, deadline: '2026-04-25', status: 'active' },
  { id: 'prop-002', title: 'Add validator node in ap-northeast-1', description: 'Deploy an additional validator node in Tokyo region to reduce latency for Asian users.', votesFor: 5400, votesAgainst: 3200, deadline: '2026-04-30', status: 'active' },
  { id: 'prop-003', title: 'Reduce epoch duration from 6400 to 3200', description: 'Faster epoch rotation for improved finality in testnets.', votesFor: 2100, votesAgainst: 6800, deadline: '2026-05-05', status: 'active' },
];

const STUB_MULTISIG: MultiSigTx[] = [
  { id: 'msig-001', to: '0xDeF1...3A7c', value: '50,000 CRL', description: 'Treasury allocation for Q2 grants', threshold: 3, approvals: 2, status: 'pending' },
  { id: 'msig-002', to: '0x9bC3...fF10', value: '12,500 CRL', description: 'Infrastructure vendor payment', threshold: 2, approvals: 2, status: 'executed' },
  { id: 'msig-003', to: '0x4aE8...2D9b', value: '200 CRL', description: 'Bug bounty payout', threshold: 2, approvals: 1, status: 'pending' },
];

const STUB_HISTORY: HistoryEntry[] = [
  { id: 'h-1', proposal: 'Enable EVM compatibility layer', vote: 'For', date: '2026-02-14', result: 'Passed' },
  { id: 'h-2', proposal: 'Reduce validator stake to 1000 CRL', vote: 'Against', date: '2026-01-28', result: 'Rejected' },
  { id: 'h-3', proposal: 'Deploy fee-burning mechanism', vote: 'For', date: '2025-12-10', result: 'Passed' },
];

const STATUS_COLOR: Record<string, string> = {
  active: '#f59e0b', passed: '#10b981', rejected: '#ef4444', pending: '#f59e0b', executed: '#10b981', cancelled: '#6b7db3',
};

const VOTE_COLOR: Record<string, string> = { For: '#10b981', Against: '#ef4444', Abstain: '#6b7db3' };

export default function GovernancePage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [hasBlockchain, setHasBlockchain] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => {
        const projects: any[] = j.projects || [];
        setHasBlockchain(projects.some((p) => p.projectType === 'blockchain'));
      })
      .catch(() => setHasBlockchain(false));
  }, []);

  if (hasBlockchain === null) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress size={32} /></Box>;
  }

  if (!hasBlockchain) {
    return (
      <Box sx={{ p: 4, maxWidth: 680 }}>
        <Box mb={4}>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ON-CHAIN GOVERNANCE</Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>Governance</Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderColor: alpha('#4F46E5', 0.2), bgcolor: alpha('#4F46E5', 0.03) }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalanceIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} gutterBottom>Governance is for Blockchain Projects</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto', lineHeight: 1.7 }}>
            Governance lets validator node operators and token holders vote on proposals, manage
            multi-signature treasury transactions, and control protocol parameters. This requires
            a Private Blockchain project with a native token and governance module.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" startIcon={<RocketLaunchIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}
              onClick={() => {
                const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
                window.location.href = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
              }}>
              Create a Blockchain Project
            </Button>
            <Button variant="outlined" sx={{ borderRadius: 999, fontWeight: 700 }} component={Link} href="/dashboard">
              Back to Overview
            </Button>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, mt: 3 }}>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>What governance unlocks:</Typography>
          <Stack spacing={1.5} mt={1}>
            {[
              'Submit and vote on protocol upgrade proposals',
              'Multi-signature treasury management with configurable thresholds',
              'Validator node rotation and stake management',
              'Token-weighted voting with quorum requirements',
              'Audit trail of all governance decisions on-chain',
            ].map((item) => (
              <Stack key={item} direction="row" spacing={1.5} alignItems="flex-start">
                <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981', mt: 0.15, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">{item}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1100 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ON-CHAIN GOVERNANCE</Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>Governance</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Vote on proposals and manage multi-signature transactions for your network.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<HowToVoteIcon />} sx={{ borderRadius: 999, fontWeight: 700 }}>
          Create Proposal
        </Button>
      </Stack>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider', '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', fontSize: '0.88rem' } }}>
        <Tab label="Active Proposals" />
        <Tab label="Multi-sig Transactions" />
      </Tabs>

      {/* Tab 0: Proposals */}
      {tab === 0 && (
        <Stack spacing={2.5}>
          {STUB_PROPOSALS.map((p) => {
            const total = p.votesFor + p.votesAgainst;
            const forPct = total > 0 ? (p.votesFor / total) * 100 : 0;
            const sc = STATUS_COLOR[p.status];
            return (
              <Paper key={p.id} variant="outlined" sx={{
                p: 3, borderRadius: 3,
                borderLeft: `4px solid ${alpha(sc, 0.6)}`,
                bgcolor: alpha(sc, 0.02),
                '&:hover': { boxShadow: `0 4px 16px ${alpha(sc, 0.1)}` },
                transition: 'box-shadow 0.15s',
              }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={2}>
                  <Box sx={{ flex: 1, mr: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5} mb={0.75}>
                      <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(sc, 0.1), color: sc, fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase' }}>
                        {p.status}
                      </Box>
                      <Typography variant="caption" color="text.disabled">{p.id}</Typography>
                    </Stack>
                    <Typography variant="body1" fontWeight={800} gutterBottom>{p.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                  </Box>
                  <Button variant="contained" size="small" startIcon={<HowToVoteIcon />}
                    disabled={p.status !== 'active'}
                    sx={{ borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    Vote
                  </Button>
                </Stack>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#10b981' }}>For: {p.votesFor.toLocaleString()}</Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#ef4444' }}>Against: {p.votesAgainst.toLocaleString()}</Typography>
                  </Stack>
                  <Box sx={{ position: 'relative', height: 6, borderRadius: 999, overflow: 'hidden', bgcolor: alpha('#ef4444', 0.12) }}>
                    <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${forPct}%`, bgcolor: '#10b981', borderRadius: 999, transition: 'width 0.4s ease' }} />
                  </Box>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">{forPct.toFixed(1)}% in favor</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Deadline: {new Date(p.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}

          {/* Voting History */}
          <Box mt={1}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <GavelIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="subtitle1" fontWeight={800}>Voting History</Typography>
            </Stack>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 3, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
                <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>PAST VOTES</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#4F46E5', 0.02) }}>
                      {['Proposal', 'Your Vote', 'Date', 'Result'].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 800, color: 'text.disabled', fontSize: '0.62rem', letterSpacing: 0.8, py: 1.5 }}>{h.toUpperCase()}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {STUB_HISTORY.map((h) => {
                      const vc = VOTE_COLOR[h.vote];
                      return (
                        <TableRow key={h.id} sx={{ '&:hover': { bgcolor: alpha('#4F46E5', 0.02) } }}>
                          <TableCell><Typography variant="body2" fontWeight={600}>{h.proposal}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(vc, 0.1), color: vc, fontSize: '0.65rem', fontWeight: 700 }}>{h.vote}</Box>
                          </TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{h.date}</Typography></TableCell>
                          <TableCell>
                            <Box sx={{ display: 'inline-flex', px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(STATUS_COLOR[h.result.toLowerCase()] || '#10b981', 0.1), color: STATUS_COLOR[h.result.toLowerCase()] || '#10b981', fontSize: '0.65rem', fontWeight: 700 }}>{h.result}</Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Stack>
      )}

      {/* Tab 1: Multi-sig */}
      {tab === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#8b5cf6', 0.03) }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <LockIcon sx={{ fontSize: 16, color: '#8b5cf6' }} />
              <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: '#8b5cf6' }}>MULTI-SIG TRANSACTIONS</Typography>
            </Stack>
          </Box>
          <Box>
            {STUB_MULTISIG.map((tx, idx) => {
              const sc = STATUS_COLOR[tx.status];
              const pct = (tx.approvals / tx.threshold) * 100;
              return (
                <Box key={tx.id} sx={{
                  px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2.5,
                  borderBottom: idx < STUB_MULTISIG.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
                  borderLeft: `3px solid ${alpha(sc, 0.4)}`,
                  '&:hover': { bgcolor: alpha(sc, 0.03) },
                }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>{tx.description}</Typography>
                    <Stack direction="row" spacing={2}>
                      <Typography variant="caption" color="text.secondary">To: <strong style={{ fontFamily: 'monospace' }}>{tx.to}</strong></Typography>
                      <Typography variant="caption" sx={{ color: sc, fontWeight: 700 }}>{tx.value}</Typography>
                    </Stack>
                  </Box>

                  {/* Approvals progress */}
                  <Box sx={{ minWidth: 120, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      {tx.approvals}/{tx.threshold} signatures
                    </Typography>
                    <LinearProgress variant="determinate" value={pct} sx={{
                      borderRadius: 999, height: 5,
                      bgcolor: alpha(sc, 0.15),
                      '& .MuiLinearProgress-bar': { bgcolor: sc },
                    }} />
                  </Box>

                  {/* Status */}
                  <Box sx={{ px: 1.25, py: 0.4, borderRadius: 1, bgcolor: alpha(sc, 0.1), color: sc, fontSize: '0.65rem', fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>
                    {tx.status}
                  </Box>

                  <Button size="small" variant={tx.status === 'pending' ? 'contained' : 'outlined'}
                    disabled={tx.status !== 'pending'}
                    sx={{ borderRadius: 999, fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}>
                    Sign
                  </Button>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
