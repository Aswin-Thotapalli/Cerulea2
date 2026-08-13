'use client';

import {
  Box, Typography, Paper, Grid, Divider,
  Table, TableBody, TableRow, TableCell, Skeleton,
  Chip, Alert, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import HashChip from '@/components/HashChip';
import TimestampCell from '@/components/TimestampCell';
import StatusBadge from '@/components/StatusBadge';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchTxByHash } from '@/lib/api/txs';
import { formatNumber, formatToken } from '@/lib/format';
import type { ExtrinsicDetail } from '@cerulea/types';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow sx={{ '&:last-child td': { border: 0 } }}>
      <TableCell sx={{ width: '28%', fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem', py: 1.5, verticalAlign: 'top' }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 1.5, wordBreak: 'break-all' }}>{children}</TableCell>
    </TableRow>
  );
}

export default function TxDetailPage() {
  const { chain } = useChainContext();
  const params = useParams<{ hash: string }>();
  const [tx, setTx] = useState<ExtrinsicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchTxByHash(chain, params.hash)
      .then(setTx)
      .catch((e: any) => setError(e?.message ?? 'Transaction not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [chain, params.hash]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Transaction</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
          {params.hash}
        </Typography>
      </Box>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Overview</Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableBody>
                  <DetailRow label="Hash">
                    {loading ? <Skeleton width={340} /> : <HashChip value={tx!.hash} />}
                  </DetailRow>
                  <DetailRow label="Status">
                    {loading ? <Skeleton width={80} /> : <StatusBadge status={tx!.status} />}
                  </DetailRow>
                  <DetailRow label="Block">
                    {loading ? <Skeleton width={80} /> : (
                      <Typography
                        component={Link}
                        href={`/${chain}/blocks/${tx!.blockNumber}`}
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        #{formatNumber(tx!.blockNumber)}
                      </Typography>
                    )}
                  </DetailRow>
                  <DetailRow label="Timestamp">
                    {loading ? <Skeleton width={180} /> : <TimestampCell tsMs={tx!.timestamp} />}
                  </DetailRow>
                  <DetailRow label="Method">
                    {loading ? <Skeleton width={160} /> : (
                      <Chip
                        label={`${tx!.section}.${tx!.method}`}
                        size="small"
                        sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                      />
                    )}
                  </DetailRow>
                  <DetailRow label="From">
                    {loading ? <Skeleton width={280} /> : tx!.from ? (
                      <Box component={Link} href={`/${chain}/accounts/${tx!.from}`} sx={{ textDecoration: 'none' }}>
                        <HashChip value={tx!.from} />
                      </Box>
                    ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </DetailRow>
                  <DetailRow label="To">
                    {loading ? <Skeleton width={280} /> : tx!.to ? (
                      <Box component={Link} href={`/${chain}/accounts/${tx!.to}`} sx={{ textDecoration: 'none' }}>
                        <HashChip value={tx!.to} />
                      </Box>
                    ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </DetailRow>
                  {!loading && tx!.value && (
                    <DetailRow label="Value">
                      <Typography variant="body2" fontWeight={600}>{formatToken(tx!.value)}</Typography>
                    </DetailRow>
                  )}
                  {!loading && tx!.fee && (
                    <DetailRow label="Fee">
                      <Typography variant="body2">{formatToken(tx!.fee)}</Typography>
                    </DetailRow>
                  )}
                  {!loading && tx!.nonce != null && (
                    <DetailRow label="Nonce">
                      <Typography variant="body2">{tx!.nonce}</Typography>
                    </DetailRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Decoded call */}
          {!loading && tx?.decodedCall && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ px: 3, py: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Decoded Call</Typography>
                </Box>
                <Divider />
                <Box sx={{ p: 3 }}>
                  <Typography
                    component="pre"
                    sx={{
                      fontFamily: 'monospace', fontSize: '0.78rem',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      m: 0, color: 'text.primary',
                    }}
                  >
                    {JSON.stringify(tx.decodedCall, null, 2)}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Raw callData */}
          {!loading && tx?.callData && (
            <Grid size={12}>
              <Accordion
                elevation={0}
                variant="outlined"
                sx={{ borderRadius: '12px !important', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700}>Raw Input Data</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 3, pt: 0 }}>
                  <Typography
                    sx={{
                      fontFamily: 'monospace', fontSize: '0.72rem',
                      wordBreak: 'break-all', color: 'text.secondary',
                    }}
                  >
                    {tx.callData}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>
          )}

          {/* Events */}
          {!loading && tx?.events != null && tx.events.length > 0 && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ px: 3, py: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700}>Events</Typography>
                  <Chip label={tx.events.length} size="small" />
                </Box>
                <Divider />
                <Box sx={{ p: 2 }}>
                  {tx.events.map((ev, i) => (
                    <Box key={i} sx={{ mb: 1, p: 1.5, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
                        [{ev.phase}] {ev.section}.{ev.method}
                      </Typography>
                      {ev.data.length > 0 && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace', wordBreak: 'break-all', mt: 0.5 }}>
                          {JSON.stringify(ev.data)}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
