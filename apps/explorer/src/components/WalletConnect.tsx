'use client';

import {
  Button, Menu, MenuItem, Box, Typography, Divider,
  ListItemIcon, ListItemText, Tooltip, CircularProgress,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LogoutIcon from '@mui/icons-material/Logout';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useState, useCallback } from 'react';
import { alpha, useTheme } from '@mui/material/styles';

type WalletType = 'polkadot' | 'metamask';

interface WalletState {
  type: WalletType;
  address: string;
  name?: string;
}

async function connectPolkadot(): Promise<WalletState> {
  const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
  const extensions = await web3Enable('Cerulea Explorer');
  if (extensions.length === 0) throw new Error('Polkadot{.js} extension not found. Please install it from https://polkadot.js.org/extension/');
  const accounts = await web3Accounts();
  if (accounts.length === 0) throw new Error('No accounts found in Polkadot{.js} extension');
  return { type: 'polkadot', address: accounts[0].address, name: accounts[0].meta.name };
}

async function connectMetaMask(): Promise<WalletState> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask not found. Please install the MetaMask extension.');
  }
  const ethereum = (window as any).ethereum;
  const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts.length) throw new Error('No MetaMask accounts found');
  return { type: 'metamask', address: accounts[0] };
}

function truncate(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

export default function WalletConnect() {
  const theme = useTheme();
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [loading, setLoading] = useState<WalletType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [connectAnchor, setConnectAnchor] = useState<null | HTMLElement>(null);
  const [copied, setCopied] = useState(false);

  const connect = useCallback(async (type: WalletType) => {
    setLoading(type);
    setError(null);
    setConnectAnchor(null);
    try {
      const state = type === 'polkadot' ? await connectPolkadot() : await connectMetaMask();
      setWallet(state);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to connect wallet');
    } finally {
      setLoading(null);
    }
  }, []);

  const disconnect = () => {
    setWallet(null);
    setMenuAnchor(null);
  };

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
              borderColor: wallet.type === 'metamask' ? '#e2761b' : theme.palette.primary.main,
              color: wallet.type === 'metamask' ? '#e2761b' : 'primary.main',
            }}
          >
            {wallet.name ? wallet.name : truncate(wallet.address)}
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
              {wallet.type === 'polkadot' ? 'Polkadot{.js}' : 'MetaMask'}
              {wallet.name && ` · ${wallet.name}`}
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
            <ListItemIcon>{copied ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}</ListItemIcon>
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
        disabled={!!loading}
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
            Select Wallet
          </Typography>
        </Box>
        {error && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" color="error.main">{error}</Typography>
          </Box>
        )}
        <MenuItem onClick={() => connect('polkadot')}>
          <ListItemIcon>
            <Box sx={{
              width: 22, height: 22, borderRadius: '50%',
              bgcolor: alpha('#e6007a', 0.15),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 900, color: '#e6007a' }}>P</Typography>
            </Box>
          </ListItemIcon>
          <ListItemText primary="Polkadot{.js}" secondary="Substrate accounts" />
        </MenuItem>
        <MenuItem onClick={() => connect('metamask')}>
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
