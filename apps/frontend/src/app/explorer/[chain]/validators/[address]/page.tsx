'use client';

import {
  Box, Typography, Paper, Grid, Divider,
  Table, TableBody, TableRow, TableCell, Skeleton,
  Chip, LinearProgress, Tooltip,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { alpha, useTheme } from '@mui/material/styles';
import HashChip from '@/components/explorer/HashChip';
import ErrorState from '@/components/explorer/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchValidator } from '@/lib/explorer/api/validators';
import { formatNumber, formatToken } from '@/lib/explorer/format';
import type { ValidatorInfo } from '@cerulea/types';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow sx={{ '&:last-child td': { border: 0 } }}>
      <TableCell sx={{ width: '30%', fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem', py: 1.5 }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 1.5, wordBreak: 'break-all' }}>{children}</TableCell>
    </TableRow>
  );
}

export default function ValidatorDetailPage() {
  const { chain } = useChainContext();
  const theme = useTheme();
  const params = useParams<{ address: string }>();
  const { address } = params;

  const [validator, setValidator] = useState<ValidatorInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchValidator(chain, address)
      .then(setValidator)
      .catch((e: any) => setError(e?.message ?? 'Validator not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [chain, address]);

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="h5" fontWeight={700}>
            {loading ? <Skeleton width={200} /> : (validator?.identity ?? 'Validator')}
          </Typography>
          {!loading && validator && (
            <Chip
              label={validator.isActive && validator.isElected ? 'Active' : validator.isActive ? 'Waiting' : 'Inactive'}
              size="small"
              color={validator.isActive && validator.isElected ? 'success' : validator.isActive ? 'warning' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {address}
        </Typography>
      </Box>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Grid container spacing={3}>
          <Grid size={{"xs":12,"sm":6,"md":3}}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={800}>
                {loading ? <Skeleton width={80} sx={{ mx: 'auto' }} /> : `${validator?.commission ?? '—'}%`}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Commission</Typography>
            </Paper>
          </Grid>
          <Grid size={{"xs":12,"sm":6,"md":3}}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={800}>
                {loading ? <Skeleton width={80} sx={{ mx: 'auto' }} /> : formatNumber(validator?.blocksProduced ?? 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Blocks Produced</Typography>
            </Paper>
          </Grid>
          <Grid size={{"xs":12,"sm":6,"md":3}}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={800}>
                {loading ? <Skeleton width={80} sx={{ mx: 'auto' }} /> : `${validator?.uptimePct?.toFixed(1) ?? '—'}%`}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Uptime</Typography>
            </Paper>
          </Grid>
          <Grid size={{"xs":12,"sm":6,"md":3}}>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800} noWrap>
                {loading ? <Skeleton width={80} sx={{ mx: 'auto' }} /> : (validator ? formatToken(validator.totalStake) : '—')}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>Total Stake</Typography>
            </Paper>
          </Grid>

          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Validator Details</Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableBody>
                  <DetailRow label="Address">
                    {loading ? <Skeleton width={340} /> : <HashChip value={validator!.address} />}
                  </DetailRow>
                  {!loading && validator?.identity && (
                    <DetailRow label="Identity">
                      <Typography variant="body2" fontWeight={600}>{validator.identity}</Typography>
                    </DetailRow>
                  )}
                  <DetailRow label="Own Stake">
                    {loading ? <Skeleton width={120} /> : <Typography variant="body2">{formatToken(validator!.ownStake)}</Typography>}
                  </DetailRow>
                  <DetailRow label="Total Stake">
                    {loading ? <Skeleton width={120} /> : <Typography variant="body2">{formatToken(validator!.totalStake)}</Typography>}
                  </DetailRow>
                  <DetailRow label="Commission">
                    {loading ? <Skeleton width={60} /> : <Typography variant="body2">{validator!.commission}%</Typography>}
                  </DetailRow>
                  <DetailRow label="Blocks Produced">
                    {loading ? <Skeleton width={80} /> : <Typography variant="body2">{formatNumber(validator!.blocksProduced)}</Typography>}
                  </DetailRow>
                  <DetailRow label="Uptime">
                    {loading ? <Skeleton width={160} /> : (
                      <Tooltip title={`${validator!.uptimePct.toFixed(4)}%`}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, maxWidth: 300 }}>
                          <LinearProgress
                            variant="determinate"
                            value={validator!.uptimePct}
                            sx={{
                              flex: 1, height: 8, borderRadius: 4,
                              bgcolor: alpha(theme.palette.success.main, 0.15),
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                bgcolor: validator!.uptimePct >= 98 ? 'success.main' : validator!.uptimePct >= 90 ? 'warning.main' : 'error.main',
                              },
                            }}
                          />
                          <Typography variant="body2" fontWeight={600}>{validator!.uptimePct.toFixed(2)}%</Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </DetailRow>
                  <DetailRow label="Status">
                    {loading ? <Skeleton width={100} /> : (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Chip
                          label={validator!.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={validator!.isActive ? 'success' : 'default'}
                          variant="outlined"
                          sx={{ fontWeight: 700 }}
                        />
                        {validator!.isElected && (
                          <Chip label="Elected" size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                        )}
                      </Box>
                    )}
                  </DetailRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
