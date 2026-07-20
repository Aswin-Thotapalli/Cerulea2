'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, CircularProgress, Divider,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

type BlockchainProject = {
  id: string;
  name: string;
  status: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string;
  userName: string | null;
};

export default function AdminBlockchainPage() {
  const [projects, setProjects] = useState<BlockchainProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/projects?type=blockchain')
      .then(r => r.json())
      .then(d => { setProjects(d.projects ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
        <HexagonOutlinedIcon sx={{ color: '#ce93d8', fontSize: 22 }} />
        <Typography variant="h4" fontWeight={900}>Blockchain Projects</Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)', mb: 4 }}>
        All L1 blockchain projects created on Cerulea Studio. On-chain metrics will appear once deployment infrastructure is connected.
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress size={32} /></Box>
      ) : projects.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6, borderRadius: 3, textAlign: 'center', borderColor: 'rgba(255,255,255,0.07)' }}>
          <HexagonOutlinedIcon sx={{ fontSize: 48, color: 'rgba(255,255,255,0.15)', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>No blockchain projects yet</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.3)' }}>Blockchain projects created in Studio will appear here.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {projects.map((proj) => (
            <Grid key={proj.id} xs={12} md={6} lg={4}>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha('#ce93d8', 0.15), background: alpha('#ce93d8', 0.03) }}>
                <Stack sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha('#ce93d8', 0.1)}` }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1rem', color: '#ce93d8' }}>{proj.name}</Typography>
                    <Chip
                      label={proj.status ?? 'draft'}
                      size="small"
                      sx={{ height: 20, fontSize: '0.63rem', fontWeight: 700, bgcolor: proj.status === 'active' ? alpha('#4caf50', 0.12) : alpha('#ffffff', 0.07), color: proj.status === 'active' ? '#4caf50' : 'rgba(255,255,255,0.45)', border: 'none', textTransform: 'capitalize' }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    {proj.userName ?? proj.userEmail}
                  </Typography>
                </Stack>
                <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />} sx={{ px: 3, py: 1.5 }} spacing={0}>
                  {[
                    { label: 'Block Height', value: '—' },
                    { label: 'TPS', value: '—' },
                    { label: 'Validators', value: '—' },
                    { label: 'Consensus Health', value: '—' },
                  ].map(({ label, value }) => (
                    <Stack key={label} direction="row" justifyContent="space-between" alignItems="center" py={0.75}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>{label}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontSize: '0.75rem' }}>{value}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 3, pb: 2, opacity: 0.4 }}>
                  <AccessTimeIcon sx={{ fontSize: 11 }} />
                  <Typography variant="caption" sx={{ fontSize: '0.67rem' }}>
                    Created {new Date(proj.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
