'use client';

import {
  Button, Menu, MenuItem, Box, Typography, Divider,
  ListItemIcon, ListItemText, Tooltip, CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LogoutIcon  from '@mui/icons-material/Logout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon   from '@mui/icons-material/Check';
import { useState, useCallback } from 'react';
import { alpha } from '@mui/material/styles';

interface WalletState {
  address: string;
  name?:   string;
}

async function connectMetaMask(): Promise<WalletState> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not found. Please install the MetaMask extension.');
  }
  const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts.length) throw new Error('No MetaMask accounts found');
  return { address: accounts[0] };
}

function truncate(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

export default function WalletConnect() {
  const [wallet, setWallet]             = useState<WalletState | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor]     = useState<null | HTMLElement>(null);
  const [connectAnchor, setConnectAnchor] = useState<null | HTMLElement>(null);
  const [copied, setCopied]             = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    setConnectAnchor(null);
    try {
      setWallet(await connectMetaMask());
    } catch (err: any) {
      setError(err?.message ?? 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = () => { setWallet(null); setMenuAnchor(null); };

  const copyAddress = async () => {
    if (!wallet) return;
    await navigator.clipboard.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (wallet) {
    return (
      <>
        <Tooltip title={wallet.address}>
          <Button
            size="small"
            variant="outlined"
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            startIcon={<AccountBalanceWalletIcon fontSize="small" />}
            sx={{
              borderRadius: 999,
              fontWeight: 700,
              fontSize: '0.78rem',
              textTransform: 'none',
              borderColor: '#e2761b',
              color: '#e2761b',
            }}
          >
            {wallet.name ?? truncate(wallet.address)}
          </Button>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { minWidth: 260, borderRadius: 2, mt: 1 } }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              MetaMask
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', fontSize: '0.72rem', wordBreak: 'break-all', mt: 0.5 }}
            >
              {wallet.address}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={copyAddress}>
            <ListItemIcon>
              {copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={copied ? 'Copied!' : 'Copy address'} />
          </MenuItem>
          <MenuItem onClick={disconnect}>
            <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Disconnect" />
          </MenuItem>
        </Menu>
      </>
    );
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => setConnectAnchor(e.currentTarget)}
        startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AccountBalanceWalletIcon fontSize="small" />}
        disabled={loading}
        sx={{ borderRadius: 999, fontWeight: 700, fontSize: '0.78rem', textTransform: 'none' }}
      >
        Connect Wallet
      </Button>
      <Menu
        anchorEl={connectAnchor}
        open={Boolean(connectAnchor)}
        onClose={() => setConnectAnchor(null)}
        PaperProps={{ sx: { minWidth: 220, borderRadius: 2, mt: 1 } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">
            Connect Wallet
          </Typography>
        </Box>
        {error && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="error.main">{error}</Typography>
          </Box>
        )}
        <MenuItem onClick={connect}>
          <ListItemIcon>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%',
              bgcolor: alpha('#e2761b', 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#e2761b' }}>M</Typography>
            </Box>
          </ListItemIcon>
          <ListItemText primary="MetaMask" secondary="EVM accounts" />
        </MenuItem>
      </Menu>
    </>
  );
}
