'use client';

import {
  Box, Typography, Paper, TablePagination, Divider,
  TextField, MenuItem, Stack,
} from '@mui/material';
import { useState, useEffect, useCallback } from 'react';
import TxsTable from '@/components/TxsTable';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchTxList } from '@/lib/api/txs';
import type { ExtrinsicSummary, TxStatus } from '@cerulea/types';

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const STATUS_OPTIONS: { value: '' | TxStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
];

export default function TxsPage() {
  const { chain } = useChainContext();
  const [txs, setTxs] = useState<ExtrinsicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'' | TxStatus>('');
  const [methodFilter, setMethodFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTxList(chain, {
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setTxs(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [chain, page, rowsPerPage, statusFilter, methodFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Transactions</Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {/* Filters */}
        <Box sx={{ px: 3, py: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as '' | TxStatus); setPage(0); }}
              sx={{ minWidth: 140 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Method (e.g. balances.transfer)"
              value={methodFilter}
              onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }}
              sx={{ minWidth: 280 }}
              placeholder="section.method"
            />
          </Stack>
        </Box>

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Divider />
            <Box sx={{ overflowX: 'auto' }}>
              <TxsTable chain={chain} txs={txs} loading={loading} showBlock />
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
