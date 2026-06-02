'use client';

import {
  Box, Typography, Paper, TablePagination, Divider,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import BlocksTable from '@/components/BlocksTable';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchBlockList } from '@/lib/api/blocks';
import type { BlockSummary } from '@cerulea/types';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function BlocksPage() {
  const { chain } = useChainContext();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchBlockList(chain, { page: page + 1, limit: rowsPerPage });
      setBlocks(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load blocks');
    } finally {
      setLoading(false);
    }
  }, [chain, page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Blocks</Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Box sx={{ overflowX: 'auto' }}>
              <BlocksTable chain={chain} blocks={blocks} loading={loading} />
            </Box>
            <Divider />
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={PAGE_SIZE_OPTIONS}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              sx={{ borderTop: 0 }}
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
