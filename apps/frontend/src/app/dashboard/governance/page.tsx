'use client';

import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Stack, Button, CircularProgress } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/Gavel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import Link from 'next/link';

export default function GovernancePage() {
  const theme = useTheme();
  const [hasBlockchain, setHasBlockchain] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => setHasBlockchain((j.projects || []).some((p: any) => p.projectType === 'blockchain')))
      .catch(() => setHasBlockchain(false));
  }, []);

  if (hasBlockchain === null) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress size={32} /></Box>;
  }

  return (
    <Box sx={{ p: 4, maxWidth: 680, mx: 'auto' }}>
      <Box mb={4}>
        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>ON-CHAIN GOVERNANCE</Typography>
        <Typography variant="h4" fontWeight={900} sx={{
          background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
        }}>Governance</Typography>
      </Box>

      {hasBlockchain ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: 'center', borderColor: alpha('#4F46E5', 0.2), bgcolor: alpha('#4F46E5', 0.03) }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '50%', mx: 'auto', mb: 2.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GavelIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          </Box>
          <Typography variant="h6" fontWeight={800} gutterBottom>Governance Requires Deployment</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 460, mx: 'auto', lineHeight: 1.7 }}>
            Your blockchain project is configured in Studio. On-chain governance — proposals, voting, and multi-sig treasury — will be available once your chain is deployed to infrastructure.
            Contabo-based deployment is coming soon.
          </Typography>
          <Button variant="outlined" sx={{ borderRadius: 1, fontWeight: 700 }} component={Link} href="/dashboard">
            Back to Overview
          </Button>
        </Paper>
      ) : (
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
            <Button variant="contained" startIcon={<RocketLaunchIcon />} sx={{ fontWeight: 700 }}
              onClick={() => {
                const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
                window.location.href = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
              }}>
              Create a Blockchain Project
            </Button>
            <Button variant="outlined" sx={{ borderRadius: 1, fontWeight: 700 }} component={Link} href="/dashboard">
              Back to Overview
            </Button>
          </Stack>
        </Paper>
      )}

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
