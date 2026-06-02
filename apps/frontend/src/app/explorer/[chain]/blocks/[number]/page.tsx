'use client';

import {
  Box, Typography, Paper, Grid, Chip, Divider,
  Table, TableBody, TableRow, TableCell, Skeleton,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { alpha, useTheme } from '@mui/material/styles';
import HashChip from '@/components/explorer/HashChip';
import TimestampCell from '@/components/explorer/TimestampCell';
import TxsTable from '@/components/explorer/TxsTable';
import ErrorState from '@/components/explorer/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchBlockByNumber } from '@/lib/explorer/api/blocks';
import { formatNumber } from '@/lib/explorer/format';
import type { BlockDetail } from '@cerulea/types';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow sx={{ '&:last-child td': { border: 0 } }}>
      <TableCell
        sx={{
          width: '30%', fontWeight: 600, color: 'text.secondary',
          fontSize: '0.82rem', verticalAlign: 'top', py: 1.5,
        }}
      >
        {label}
      </TableCell>
      <TableCell sx={{ py: 1.5, wordBreak: 'break-all' }}>{children}</TableCell>
    </TableRow>
  );
}

export default function BlockDetailPage() {
  const { chain } = useChainContext();
  const params = useParams<{ number: string }>();
  const blockNumber = parseInt(params.number, 10);
  const theme = useTheme();

  const [block, setBlock] = useState<BlockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchBlockByNumber(chain, blockNumber)
      .then(setBlock)
      .catch((e: any) => setError(e?.message ?? 'Block not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (!isNaN(blockNumber)) load(); }, [chain, blockNumber]);

  if (!isNaN(blockNumber) === false) {
    return <ErrorState title="Invalid Block Number" message="The block number in the URL is not valid." />;
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>
          Block #{loading ? <Skeleton component="span" width={80} sx={{ display: 'inline-block' }} /> : formatNumber(blockNumber)}
        </Typography>
        {block && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              component={Link}
              href={`/explorer/${chain}/blocks/${blockNumber - 1}`}
              size="small"
              variant="outlined"
              disabled={blockNumber <= 0}
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{ borderRadius: 999, textTransform: 'none' }}
            >
              Prev
            </Button>
            <Button
              component={Link}
              href={`/explorer/${chain}/blocks/${blockNumber + 1}`}
              size="small"
              variant="outlined"
              endIcon={<ArrowForwardIcon fontSize="small" />}
              sx={{ borderRadius: 999, textTransform: 'none' }}
            >
              Next
            </Button>
          </Box>
        )}
      </Box>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Grid container spacing={3}>
          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Block Details</Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableBody>
                  <DetailRow label="Block Height">
                    <Typography variant="body2" fontWeight={700}>
                      {loading ? <Skeleton width={80} /> : `#${formatNumber(blockNumber)}`}
                    </Typography>
                  </DetailRow>
                  <DetailRow label="Timestamp">
                    {loading ? <Skeleton width={180} /> : block && <TimestampCell tsMs={block.timestamp} />}
                  </DetailRow>
                  <DetailRow label="Hash">
                    {loading ? <Skeleton width={340} /> : block && <HashChip value={block.hash} />}
                  </DetailRow>
                  <DetailRow label="Parent Hash">
                    {loading ? <Skeleton width={340} /> : block && (
                      <Box component={Link} href={`/explorer/${chain}/blocks/${blockNumber - 1}`} sx={{ textDecoration: 'none' }}>
                        <HashChip value={block.parentHash} />
                      </Box>
                    )}
                  </DetailRow>
                  <DetailRow label="State Root">
                    {loading ? <Skeleton width={340} /> : block && <HashChip value={block.stateRoot} />}
                  </DetailRow>
                  <DetailRow label="Extrinsics Root">
                    {loading ? <Skeleton width={340} /> : block && <HashChip value={block.extrinsicsRoot} />}
                  </DetailRow>
                  <DetailRow label="Validator">
                    {loading ? <Skeleton width={220} /> : block?.author ? (
                      <Box component={Link} href={`/explorer/${chain}/validators/${block.author}`} sx={{ textDecoration: 'none' }}>
                        <HashChip value={block.author} head={10} tail={8} />
                      </Box>
                    ) : <Typography variant="body2" color="text.disabled">—</Typography>}
                  </DetailRow>
                  <DetailRow label="Transactions">
                    {loading ? <Skeleton width={40} /> : (
                      <Typography variant="body2">{block?.txCount ?? 0}</Typography>
                    )}
                  </DetailRow>
                  <DetailRow label="Block Time">
                    {loading ? <Skeleton width={60} /> : (
                      <Typography variant="body2">
                        {block?.blockTime != null ? `${(block.blockTime / 1000).toFixed(2)}s` : '—'}
                      </Typography>
                    )}
                  </DetailRow>
                  {block?.weight != null && (
                    <DetailRow label="Weight">
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {block.weight}
                      </Typography>
                    </DetailRow>
                  )}
                  {block?.size != null && (
                    <DetailRow label="Size">
                      <Typography variant="body2">{(block.size / 1024).toFixed(2)} KB</Typography>
                    </DetailRow>
                  )}
                  {block?.events != null && (
                    <DetailRow label="Events">
                      <Typography variant="body2">{block.events.length}</Typography>
                    </DetailRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {(loading || (block?.extrinsics && block.extrinsics.length > 0)) && (
            <Grid size={12}>
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Box sx={{ px: 3, py: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Extrinsics
                    {block && <Chip label={block.extrinsics?.length ?? 0} size="small" sx={{ ml: 1 }} />}
                  </Typography>
                </Box>
                <Divider />
                <Box sx={{ overflowX: 'auto' }}>
                  <TxsTable
                    chain={chain}
                    txs={block?.extrinsics ?? []}
                    loading={loading}
                    showBlock={false}
                  />
                </Box>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
}
