'use client';

import {
  Box, Typography, Paper, TextField, Button,
  Step, Stepper, StepLabel, Alert, CircularProgress,
  MenuItem, Divider,
} from '@mui/material';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useChainContext } from '@/context/ChainContext';
import { verifyContract } from '@/lib/explorer/api/contracts';

const COMPILER_VERSIONS = [
  'v0.8.20+commit.a1b79de6',
  'v0.8.19+commit.7dd6d404',
  'v0.8.18+commit.87f61d96',
  'v0.8.17+commit.8df45f5f',
  'v0.8.0+commit.c7dfd78e',
];

const OPTIMIZATIONS = ['No optimization', '200 runs', '1000 runs', '10000 runs'];

type VerifyStep = 0 | 1 | 2;

export default function VerifyContractPage() {
  const { chain } = useChainContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<VerifyStep>(0);
  const [address, setAddress] = useState(searchParams.get('address') ?? '');
  const [contractName, setContractName] = useState('');
  const [compilerVersion, setCompilerVersion] = useState(COMPILER_VERSIONS[0]);
  const [optimization, setOptimization] = useState(OPTIMIZATIONS[0]);
  const [sourceCode, setSourceCode] = useState('');
  const [abi, setAbi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await verifyContract(chain, {
        address,
        contractName,
        compilerVersion,
        optimization,
        sourceCode,
        abi: abi ? JSON.parse(abi) : undefined,
      });
      setSuccess(true);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Verify Contract</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Submit your contract source code to verify it on the Cerulea network. Verified contracts
        display their source, ABI, and enable read/write interaction.
      </Typography>

      <Stepper activeStep={step} sx={{ mb: 4 }}>
        <Step><StepLabel>Contract Info</StepLabel></Step>
        <Step><StepLabel>Source Code</StepLabel></Step>
        <Step><StepLabel>Complete</StepLabel></Step>
      </Stepper>

      {step === 0 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>Contract Information</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Contract Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              fullWidth size="small" placeholder="0x... or SS58"
              inputProps={{ style: { fontFamily: 'monospace' } }}
              required
            />
            <TextField
              label="Contract Name"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              fullWidth size="small" placeholder="e.g. MyToken" required
            />
            <TextField
              select label="Compiler Version" value={compilerVersion}
              onChange={(e) => setCompilerVersion(e.target.value)}
              fullWidth size="small"
            >
              {COMPILER_VERSIONS.map((v) => (
                <MenuItem key={v} value={v} sx={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Optimization" value={optimization}
              onChange={(e) => setOptimization(e.target.value)}
              fullWidth size="small"
            >
              {OPTIMIZATIONS.map((o) => (
                <MenuItem key={o} value={o}>{o}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={() => setStep(1)}
              disabled={!address.trim() || !contractName.trim()}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              Next
            </Button>
          </Box>
        </Paper>
      )}

      {step === 1 && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 3 }}>Source Code</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Solidity Source Code" value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              fullWidth multiline minRows={12} maxRows={24} size="small"
              placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.20;&#10;&#10;contract MyToken { ... }"
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              required
            />
            <TextField
              label="ABI (optional — JSON)" value={abi}
              onChange={(e) => setAbi(e.target.value)}
              fullWidth multiline minRows={4} size="small"
              placeholder='[{"type":"function","name":"balanceOf",...}]'
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>{error}</Alert>
          )}

          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => setStep(0)} sx={{ borderRadius: 999, textTransform: 'none' }}>
              Back
            </Button>
            <Button
              variant="contained" onClick={handleSubmit}
              disabled={loading || !sourceCode.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              {loading ? 'Verifying…' : 'Submit Verification'}
            </Button>
          </Box>
        </Paper>
      )}

      {step === 2 && success && (
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 4, textAlign: 'center' }}>
          <Typography variant="h6" fontWeight={700} color="success.main" sx={{ mb: 1 }}>
            Contract Verified!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your contract source code has been submitted and is being verified. This may take a few moments.
          </Typography>
          <Button
            variant="contained"
            onClick={() => router.push(`/explorer/${chain}/contracts/${address}`)}
            sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
          >
            View Contract
          </Button>
        </Paper>
      )}
    </Box>
  );
}
