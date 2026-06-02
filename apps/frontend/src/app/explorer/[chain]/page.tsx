'use client';

import {
  Box, Typography, Paper, Grid, Button, Divider,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Link from 'next/link';
import { alpha, useTheme } from '@mui/material/styles';
import NetworkStatsBar from '@/components/explorer/NetworkStatsBar';
import BlocksTable from '@/components/explorer/BlocksTable';
import TxsTable from '@/components/explorer/TxsTable';
import LiveItemBanner from '@/components/explorer/LiveItemBanner';
import { useChainContext } from '@/context/ChainContext';
import { useLiveBlocks } from '@/hooks/useLiveBlocks';
import { useLiveTxs } from '@/hooks/useLiveTxs';
import { useNetworkStats } from '@/hooks/useNetworkStats';

export default function ChainHomePage() {
  const { chain } = useChainContext();
  const { blocks, newNumbers, loading: blocksLoading } = useLiveBlocks({ limit: 10 });
  const { txs, newHashes, loading: txsLoading } = useLiveTxs({ limit: 10 });
  const { stats, loading: statsLoading } = useNetworkStats();

  return (
    <Box>
      <NetworkStatsBar stats={stats} loading={statsLoading} />

      <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
        <Grid container spacing={3}>
          {/* Latest Blocks */}
          <Grid size={{"xs":12,"lg":6}}>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden' }}
            >
              <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>Latest Blocks</Typography>
                  <LiveItemBanner newCount={newNumbers?.size ?? 0} label="new" />
                </Box>
                <Button
                  component={Link}
                  href={`/explorer/${chain}/blocks`}
                  size="small"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                >
                  View all
                </Button>
              </Box>
              <Divider />
              <Box sx={{ overflowX: 'auto' }}>
                <BlocksTable
                  chain={chain}
                  blocks={blocks}
                  loading={blocksLoading}
                  newNumbers={newNumbers}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Latest Transactions */}
          <Grid size={{"xs":12,"lg":6}}>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden' }}
            >
              <Box sx={{ px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography variant="h6" fontWeight={700}>Latest Transactions</Typography>
                  <LiveItemBanner newCount={newHashes?.size ?? 0} label="new" />
                </Box>
                <Button
                  component={Link}
                  href={`/explorer/${chain}/txs`}
                  size="small"
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
                >
                  View all
                </Button>
              </Box>
              <Divider />
              <Box sx={{ overflowX: 'auto' }}>
                <TxsTable
                  chain={chain}
                  txs={txs}
                  loading={txsLoading}
                  newHashes={newHashes}
                  showBlock
                />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
