'use client';

import {
  Box, Typography, Paper, Grid, Divider,
  Table, TableBody, TableRow, TableCell, Skeleton,
  Chip, Tab, Tabs, Alert, Button,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { alpha, useTheme } from '@mui/material/styles';
import HashChip from '@/components/HashChip';
import ContractInteract, { type AbiFunction } from '@/components/ContractInteract';
import ErrorState from '@/components/ErrorState';
import { useChainContext } from '@/context/ChainContext';
import { fetchContract } from '@/lib/api/contracts';
import type { ContractInfo } from '@cerulea/types';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <TableRow sx={{ '&:last-child td': { border: 0 } }}>
      <TableCell sx={{ width: '28%', fontWeight: 600, color: 'text.secondary', fontSize: '0.82rem', py: 1.5 }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 1.5, wordBreak: 'break-all' }}>{children}</TableCell>
    </TableRow>
  );
}

export default function ContractDetailPage() {
  const { chain } = useChainContext();
  const params = useParams<{ address: string }>();
  const { address } = params;
  const theme = useTheme();

  const [contract, setContract] = useState<ContractInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    fetchContract(chain, address)
      .then(setContract)
      .catch((e: any) => setError(e?.message ?? 'Contract not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [chain, address]);

  const copyBytecode = async () => {
    if (!contract?.bytecode) return;
    await navigator.clipboard.writeText(contract.bytecode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const parsedAbi: AbiFunction[] = (() => {
    if (!contract?.abi) return [];
    try {
      const raw = typeof contract.abi === 'string' ? JSON.parse(contract.abi) : contract.abi;
      return (Array.isArray(raw) ? raw : []) as AbiFunction[];
    } catch { return []; }
  })();

  const handleContractCall = async (fn: AbiFunction, args: string[]) => {
    // In a real implementation this would use viem to call the contract
    return { output: `(call to ${fn.name} with [${args.join(', ')}] — connect a wallet to execute)` };
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h5" fontWeight={700}>
              {loading ? <Skeleton width={200} /> : (contract?.contractName ?? 'Contract')}
            </Typography>
            {!loading && contract?.isVerified && (
              <Chip
                icon={<VerifiedIcon sx={{ fontSize: '14px !important' }} />}
                label="Verified"
                size="small"
                color="success"
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: '0.72rem' }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {address}
          </Typography>
        </Box>
        {!loading && !contract?.isVerified && (
          <Button
            component={Link}
            href={`/${chain}/contracts/verify?address=${address}`}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
          >
            Verify Contract
          </Button>
        )}
      </Box>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Grid container spacing={3}>
          {/* Overview */}
          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3 }}>
              <Box sx={{ px: 3, py: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Contract Overview</Typography>
              </Box>
              <Divider />
              <Table size="small">
                <TableBody>
                  <DetailRow label="Address">
                    {loading ? <Skeleton width={340} /> : <HashChip value={contract!.address} />}
                  </DetailRow>
                  {!loading && contract?.deployerAddress && (
                    <DetailRow label="Deployer">
                      <Box component={Link} href={`/${chain}/accounts/${contract.deployerAddress}`} sx={{ textDecoration: 'none' }}>
                        <HashChip value={contract.deployerAddress} />
                      </Box>
                    </DetailRow>
                  )}
                  {!loading && contract?.contractName && (
                    <DetailRow label="Contract Name">
                      <Typography variant="body2" fontFamily="monospace">{contract.contractName}</Typography>
                    </DetailRow>
                  )}
                  {!loading && contract?.compilerVersion && (
                    <DetailRow label="Compiler">
                      <Typography variant="body2" fontFamily="monospace">{contract.compilerVersion}</Typography>
                    </DetailRow>
                  )}
                  <DetailRow label="Verified">
                    {loading ? <Skeleton width={80} /> : (
                      <Chip
                        label={contract!.isVerified ? 'Yes' : 'No'}
                        size="small"
                        color={contract!.isVerified ? 'success' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </DetailRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          {/* Tabs: Code / Read / Write */}
          <Grid size={12}>
            <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ px: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <Tabs value={tab} onChange={(_, v) => setTab(v)}>
                  <Tab label="Source Code" sx={{ fontWeight: 700, textTransform: 'none' }} />
                  <Tab label="Read Contract" sx={{ fontWeight: 700, textTransform: 'none' }} disabled={parsedAbi.length === 0} />
                  <Tab label="Write Contract" sx={{ fontWeight: 700, textTransform: 'none' }} disabled={parsedAbi.length === 0} />
                </Tabs>
              </Box>

              {tab === 0 && (
                <Box sx={{ p: 3 }}>
                  {loading ? (
                    <Skeleton height={200} variant="rectangular" sx={{ borderRadius: 2 }} />
                  ) : !contract?.isVerified ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      This contract is not verified. Source code is not available.{' '}
                      <Typography
                        component={Link}
                        href={`/${chain}/contracts/verify?address=${address}`}
                        variant="body2"
                        sx={{ color: 'inherit', fontWeight: 700 }}
                      >
                        Verify it →
                      </Typography>
                    </Alert>
                  ) : (
                    <>
                      {contract.sourceCode && (
                        <>
                          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Source Code</Typography>
                          <Paper
                            variant="outlined"
                            sx={{ p: 2, borderRadius: 2, bgcolor: alpha(theme.palette.action.hover, 0.3), mb: 3 }}
                          >
                            <Box
                              component="pre"
                              sx={{
                                m: 0, fontFamily: 'monospace', fontSize: '0.78rem',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                maxHeight: 480, overflowY: 'auto',
                              }}
                            >
                              {contract.sourceCode}
                            </Box>
                          </Paper>
                        </>
                      )}
                      {contract.bytecode && (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>Bytecode</Typography>
                            <Button
                              size="small"
                              startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                              onClick={copyBytecode}
                              sx={{ borderRadius: 999, textTransform: 'none', fontSize: '0.75rem' }}
                            >
                              {copied ? 'Copied' : 'Copy'}
                            </Button>
                          </Box>
                          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                            <Typography
                              sx={{
                                fontFamily: 'monospace', fontSize: '0.7rem',
                                wordBreak: 'break-all', color: 'text.secondary',
                                maxHeight: 120, overflowY: 'auto',
                              }}
                            >
                              {contract.bytecode}
                            </Typography>
                          </Paper>
                        </>
                      )}
                    </>
                  )}
                </Box>
              )}

              {tab === 1 && (
                <Box sx={{ p: 3 }}>
                  <ContractInteract
                    abi={parsedAbi.filter(f => f.stateMutability === 'view' || f.stateMutability === 'pure')}
                    contractAddress={address}
                    onCall={handleContractCall}
                  />
                </Box>
              )}

              {tab === 2 && (
                <Box sx={{ p: 3 }}>
                  <Alert severity="warning" sx={{ borderRadius: 2, mb: 2 }}>
                    Connect a wallet to execute write functions.
                  </Alert>
                  <ContractInteract
                    abi={parsedAbi.filter(f => f.stateMutability !== 'view' && f.stateMutability !== 'pure')}
                    contractAddress={address}
                    onCall={handleContractCall}
                  />
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
