'use client';

import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails,
  TextField, Button, Alert, CircularProgress, Chip, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';

export interface AbiInput {
  name: string;
  type: string;
  components?: AbiInput[];
}

export interface AbiOutput {
  name: string;
  type: string;
}

export interface AbiFunction {
  name: string;
  type: 'function' | 'constructor' | 'event' | 'fallback' | 'receive';
  inputs: AbiInput[];
  outputs: AbiOutput[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

interface FunctionCallResult {
  output?: string;
  error?: string;
}

interface FunctionCardProps {
  fn: AbiFunction;
  contractAddress: string;
  onCall: (fn: AbiFunction, args: string[]) => Promise<FunctionCallResult>;
}

function FunctionCard({ fn, contractAddress, onCall }: FunctionCardProps) {
  const theme = useTheme();
  const isRead = fn.stateMutability === 'view' || fn.stateMutability === 'pure';
  const [args, setArgs] = useState<string[]>(fn.inputs.map(() => ''));
  const [result, setResult] = useState<FunctionCallResult | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await onCall(fn, args);
      setResult(res);
    } catch (e: any) {
      setResult({ error: e?.message ?? 'Execution failed' });
    } finally {
      setLoading(false);
    }
  };

  const accentColor = isRead ? theme.palette.info.main : theme.palette.warning.main;

  return (
    <Accordion
      elevation={0}
      disableGutters
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        mb: 1,
        '&.Mui-expanded': {
          borderColor: alpha(accentColor, 0.4),
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon fontSize="small" />}
        sx={{ px: 2, py: 0.5, minHeight: 48, '& .MuiAccordionSummary-content': { gap: 1, alignItems: 'center' } }}
      >
        {isRead
          ? <LockOpenIcon sx={{ fontSize: 15, color: 'info.main' }} />
          : <LockIcon sx={{ fontSize: 15, color: 'warning.main' }} />}
        <Typography variant="body2" fontWeight={700} sx={{ fontFamily: 'monospace' }}>
          {fn.name}
        </Typography>
        {fn.inputs.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            ({fn.inputs.map(i => i.type).join(', ')})
          </Typography>
        )}
        {fn.outputs.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            → {fn.outputs.map(o => o.type).join(', ')}
          </Typography>
        )}
        <Box sx={{ flex: 1 }} />
        <Chip
          label={fn.stateMutability}
          size="small"
          sx={{
            fontSize: '0.65rem',
            height: 18,
            bgcolor: alpha(accentColor, 0.1),
            color: accentColor,
            border: `1px solid ${alpha(accentColor, 0.3)}`,
          }}
        />
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 2, pb: 2 }}>
        <Divider sx={{ mb: 2 }} />
        {fn.inputs.map((input, idx) => (
          <TextField
            key={idx}
            fullWidth
            size="small"
            label={`${input.name || `param${idx}`} (${input.type})`}
            value={args[idx]}
            onChange={(e) => {
              const next = [...args];
              next[idx] = e.target.value;
              setArgs(next);
            }}
            sx={{ mb: 1.5 }}
            placeholder={input.type}
          />
        ))}
        <Button
          variant={isRead ? 'outlined' : 'contained'}
          size="small"
          onClick={execute}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
          sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none' }}
          color={isRead ? 'info' : 'warning'}
        >
          {isRead ? 'Query' : 'Execute'}
        </Button>

        {result && (
          <Box sx={{ mt: 2 }}>
            {result.error ? (
              <Alert severity="error" sx={{ borderRadius: 2, fontSize: '0.8rem' }}>
                {result.error}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {result.output ?? '(no return value)'}
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

interface ContractInteractProps {
  abi: AbiFunction[];
  contractAddress: string;
  onCall: (fn: AbiFunction, args: string[]) => Promise<FunctionCallResult>;
}

export default function ContractInteract({ abi, contractAddress, onCall }: ContractInteractProps) {
  const readFns = abi.filter(
    f => f.type === 'function' && (f.stateMutability === 'view' || f.stateMutability === 'pure')
  );
  const writeFns = abi.filter(
    f => f.type === 'function' && f.stateMutability !== 'view' && f.stateMutability !== 'pure'
  );

  return (
    <Box>
      {readFns.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'info.main' }}>
            Read Functions ({readFns.length})
          </Typography>
          {readFns.map((fn, i) => (
            <FunctionCard key={i} fn={fn} contractAddress={contractAddress} onCall={onCall} />
          ))}
        </Box>
      )}
      {writeFns.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: 'warning.main' }}>
            Write Functions ({writeFns.length})
          </Typography>
          {writeFns.map((fn, i) => (
            <FunctionCard key={i} fn={fn} contractAddress={contractAddress} onCall={onCall} />
          ))}
        </Box>
      )}
      {readFns.length === 0 && writeFns.length === 0 && (
        <Typography variant="body2" color="text.secondary">No callable functions found in ABI.</Typography>
      )}
    </Box>
  );
}
