'use client';

import {
  Box, Typography, Paper, Grid, Divider,
  Table, TableBody, TableRow, TableCell, Skeleton,
  Chip, TablePagination, Tab, Tabs,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import HashChip from '@/components/HashChip';
import TxsTable from '@/components/TxsTable';
import AddressQR from '@/components/AddressQR';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchAccount, fetchAccountTxs } from '@/lib/api/accounts';
import type { AccountInfo, ExtrinsicSummary } from '@cerulea/types';

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

export default function AccountDetailPage() {
  const { chain } = useChainContext();
  const params = useParams<{ address: string }>();
  const { address } = params;

  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [txs, setTxs] = useState<ExtrinsicSummary[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(0);
  const [tab, setTab] = useState(0);

  const loadAccount = () => {
    setLoading(true);
    fetchAccount(chain, address)
      .then(setAccount)
      .catch((e: any) => setError(e?.message ?? 'Account not found'))
      .finally(() => setLoading(false));
  };

  const loadTxs = async (page: number) => {
    setTxLoading(true);
    try {
      const result = await fetchAccountTxs(chain, address, { page: page + 1, limit: 25 });
      setTxs(result.items);
      setTxTotal(result.total);
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => { loadAccount(); }, [chain, address]);
  useEffect(() => { loadTxs(txPage); }, [chain, address, txPage]);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {loading ? <Skeleton width={200} /> : account?.isContract ? 'Contract Account' : 'Account'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
          {address}
        </Typography>
      </Box>

      {error ? (
        <ErrorState message={error} onRetry={loadAccount} />
      ) : (
        <Grid container spacing={3}>
          {/* Overview */}
          <Grid size={{"xs":12,"md":8}}>
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Overview</Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableBody>
                  <DetailRow label="Address">
                    {loading ? <Skeleton width={340} /> : <HashChip value={account!.address} />}
                  </DetailRow>
                  {!loading && account?.evmAddress && (
                    <DetailRow label="EVM Address">
                      <HashChip value={account.evmAddress} />
                    </DetailRow>
                  )}
                  <DetailRow label="Balance">
                    {loading ? <Skeleton width={140} /> : (
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{account!.balance.total}</Typography>
                        {account!.balance.reserved !== '0' && (
                          <Typography variant="caption" color="text.secondary">
                            Free: {account!.balance.free} · Reserved: {account!.balance.reserved}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </DetailRow>
                  <DetailRow label="Nonce">
                    {loading ? <Skeleton width={60} /> : (
                      <Typography variant="body2">{account!.nonce}</Typography>
                    )}
                  </DetailRow>
                  <DetailRow label="Type">
                    {loading ? <Skeleton width={100} /> : (
                      <Chip
                        label={account!.isContract ? 'Contract' : 'EOA'}
                        size="small"
                        color={account!.isContract ? 'secondary' : 'default'}
                        variant="outlined"
                      />
                    )}
                  </DetailRow>
                  {!loading && account?.isContract && (
                    <DetailRow label="Contract">
                      <Typography
                        component={Link}
                        href={`/${chain}/contracts/${address}`}
                        variant="body2"
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        View Contract →
                      </Typography>
                    </DetailRow>
                  )}
                  {!loading && account?.stakingInfo && account.stakingInfo.role !== 'none' && (
                    <DetailRow label="Staking">
                      <Box>
                        <Chip label={account.stakingInfo.role} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700, mr: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                          Staked: {account.stakingInfo.staked}
                          {account.stakingInfo.unbonding !== '0' && ` · Unbonding: ${account.stakingInfo.unbonding}`}
                        </Typography>
                      </Box>
                    </DetailRow>
                  )}
                </TableBody>
              </Table>
            </Paper>

            {/* Token Balances */}
            {!loading && account?.tokenBalances && account.tokenBalances.length > 0 && (
              <Paper variant="outlined" sx={{ borderRadius: 3, mt: 3 }}>
                <Box sx={{ px: 3, py: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Token Balances</Typography>
                </Box>
                <Divider />
                <Table size="small">
                  <TableBody>
                    {account.tokenBalances.map((tb, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ fontWeight: 600 }}>{tb.symbol}</TableCell>
                        <TableCell>{tb.balance}</TableCell>
                        <TableCell>
                          <HashChip value={tb.contractAddress} compact head={6} tail={4} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Grid>

          {/* QR Code */}
          <Grid size={{"xs":12,"md":4}}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' } }}>
              <AddressQR address={address} label="Scan to send" />
            </Box>
          </Grid>

          {/* Transactions */}
          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 3, pt: 1 }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ minHeight: 44 }}>
                  <Tab label="Transactions" sx={{ fontWeight: 700, textTransform: 'none' }} />
                </Tabs>
              </Box>
              <Divider />
              <Box sx={{ overflowX: 'auto' }}>
                <TxsTable chain={chain} txs={txs} loading={txLoading} showBlock />
              </Box>
              <Divider />
              <TablePagination
                component="div"
                count={txTotal}
                page={txPage}
                rowsPerPage={25}
                rowsPerPageOptions={[25]}
                onPageChange={(_, p) => setTxPage(p)}
                sx={{ borderTop: 0 }}
              />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
