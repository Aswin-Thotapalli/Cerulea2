'use client';

import {
  Box, Typography, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, Skeleton, Chip, LinearProgress,
  Tooltip, TablePagination, Divider,
} from '@mui/material';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { alpha, useTheme } from '@mui/material/styles';
import HashChip from '@/components/HashChip';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchValidatorList } from '@/lib/api/validators';
import { formatNumber, formatToken } from '@/lib/format';
import type { ValidatorInfo } from '@cerulea/types';

export default function ValidatorsPage() {
  const { chain } = useChainContext();
  const theme = useTheme();
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchValidatorList(chain, { page: page + 1, limit: 25 });
      setValidators(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load validators');
    } finally {
      setLoading(false);
    }
  }, [chain, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Validators</Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: '5%', fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ width: '28%', fontWeight: 700 }}>Validator</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Commission</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total Stake</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Own Stake</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Blocks</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Uptime</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((__, j) => (
                            <TableCell key={j}><Skeleton /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : validators.map((v, idx) => (
                        <TableRow
                          key={v.address}
                          hover
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) } }}
                        >
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">{page * 25 + idx + 1}</Typography>
                          </TableCell>
                          <TableCell>
                            <Box>
                              {v.identity && (
                                <Typography variant="body2" fontWeight={600} noWrap>{v.identity}</Typography>
                              )}
                              <Typography
                                component={Link}
                                href={`/${chain}/validators/${v.address}`}
                                variant="caption"
                                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                              >
                                <HashChip value={v.address} compact head={8} tail={6} />
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{v.commission}%</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatToken(v.totalStake)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatToken(v.ownStake)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{formatNumber(v.blocksProduced)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Tooltip title={`${v.uptimePct.toFixed(2)}%`}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={v.uptimePct}
                                  sx={{
                                    flex: 1, height: 6, borderRadius: 3,
                                    bgcolor: alpha(theme.palette.success.main, 0.15),
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: v.uptimePct >= 98 ? 'success.main' : v.uptimePct >= 90 ? 'warning.main' : 'error.main',
                                    },
                                  }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {v.uptimePct.toFixed(0)}%
                                </Typography>
                              </Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={v.isActive ? (v.isElected ? 'Active' : 'Waiting') : 'Inactive'}
                              size="small"
                              color={v.isActive && v.isElected ? 'success' : v.isActive ? 'warning' : 'default'}
                              variant="outlined"
                              sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </Box>
            <Divider />
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={25}
              rowsPerPageOptions={[25]}
              onPageChange={(_, p) => setPage(p)}
              sx={{ borderTop: 0 }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
