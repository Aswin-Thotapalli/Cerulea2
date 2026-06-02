'use client';

import {
  Box, Typography, Paper, TextField, Button, Alert,
  CircularProgress, Chip, Tab, Tabs,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useState } from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { useChainContext } from '@/context/ChainContext';
import { useWs } from '@/context/WsContext';
import { submitAndWatch, type ExtrinsicStatus } from '@/lib/explorer/rpc/subscriptions';
import WalletConnect from '@/components/explorer/WalletConnect';

interface TxStatusEvent {
  type: 'broadcast' | 'inBlock' | 'finalized' | 'error';
  data?: string;
  ts: number;
}

export default function SubmitTxPage() {
  const { chain } = useChainContext();
  const { client } = useWs();
  const theme = useTheme();

  const [tab, setTab] = useState(0);

  const [rawHex, setRawHex] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<TxStatusEvent[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleRawSubmit = () => {
    if (!client || !rawHex.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    setEvents([]);
    setDone(false);

    const unsub = submitAndWatch(client, rawHex.trim(), (s: ExtrinsicStatus) => {
      const data = 'blockHash' in s ? s.blockHash : 'message' in s ? s.message : undefined;
      setEvents((prev) => [...prev, { type: s.type as TxStatusEvent['type'], data, ts: Date.now() }]);
      if (s.type === 'finalized' || s.type === 'error') {
        setSubmitting(false);
        setDone(true);
        unsub?.();
      }
    });
  };

  const statusColor = (type: TxStatusEvent['type']) => {
    if (type === 'finalized') return 'success';
    if (type === 'error') return 'error';
    if (type === 'inBlock') return 'info';
    return 'default';
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Submit Transaction</Typography>
        <Typography variant="body2" color="text.secondary">
          Broadcast a signed extrinsic to the {chain} chain, or use an ABI-driven form to encode and submit.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">Connect a wallet to sign:</Typography>
        <WalletConnect />
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ px: 3, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Raw Extrinsic" sx={{ fontWeight: 700, textTransform: 'none' }} />
            <Tab label="Encoded Call" sx={{ fontWeight: 700, textTransform: 'none' }} />
          </Tabs>
        </Box>

        {tab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Signed Extrinsic Hex
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Paste a signed extrinsic in hex format to broadcast it to the network.
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              value={rawHex}
              onChange={(e) => setRawHex(e.target.value)}
              placeholder="0x..."
              inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
              size="small"
              sx={{ mb: 2 }}
            />

            {submitError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{submitError}</Alert>
            )}

            <Button
              variant="contained"
              onClick={handleRawSubmit}
              disabled={submitting || !rawHex.trim() || !client}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
              sx={{ borderRadius: 999, fontWeight: 700, textTransform: 'none', px: 3 }}
            >
              {submitting ? 'Broadcasting…' : 'Submit'}
            </Button>

            {!client && (
              <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                WebSocket not connected. Cannot submit.
              </Typography>
            )}

            {events.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                  Transaction Status
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {events.map((ev, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Chip
                        label={ev.type}
                        size="small"
                        color={statusColor(ev.type) as any}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.72rem', textTransform: 'capitalize', flexShrink: 0 }}
                      />
                      {ev.data && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', color: 'text.secondary', mt: 0.3 }}>
                          {ev.data}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                {done && events.some(e => e.type === 'finalized') && (
                  <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                    Transaction finalized successfully.
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ p: 3 }}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              The encoded call builder is available when a contract ABI is provided. Navigate to a{' '}
              <strong>Contract</strong> page and use the Write tab to build and submit calls from there.
            </Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
