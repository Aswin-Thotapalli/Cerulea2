'use client';

import { useState, useCallback } from 'react';
import {
  InputBase, Box, IconButton, Paper, Typography,
  List, ListItem, ListItemButton, ListItemText, ClickAwayListener,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { alpha, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { useChainContext } from '@/context/ChainContext';

type QueryType = 'block' | 'tx' | 'account' | 'contract' | 'unknown';

function classifyQuery(q: string): QueryType {
  const trimmed = q.trim();
  if (/^\d+$/.test(trimmed)) return 'block';
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed)) return 'tx';
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return 'account';
  if (/^[1-9A-HJ-NP-Za-km-z]{46,50}$/.test(trimmed)) return 'account';
  return 'unknown';
}

interface Suggestion {
  label: string;
  detail: string;
  type: QueryType;
}

function getSuggestions(q: string): Suggestion[] {
  if (!q.trim()) return [];
  const type = classifyQuery(q.trim());
  if (type === 'block') return [{ label: `Block #${q.trim()}`, detail: 'Go to block', type }];
  if (type === 'tx') return [{ label: 'Transaction', detail: q.trim(), type }];
  if (type === 'account') return [
    { label: 'Account', detail: q.trim(), type: 'account' },
    { label: 'Contract', detail: q.trim(), type: 'contract' },
  ];
  return [];
}

interface SearchBarProps {
  placeholder?: string;
  fullWidth?: boolean;
}

export default function SearchBar({ placeholder = 'Search by block / tx hash / address', fullWidth }: SearchBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const { chain } = useChainContext();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const suggestions = getSuggestions(query);

  const navigate = useCallback((q: string, hint?: QueryType) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    const type = hint ?? classifyQuery(trimmed);
    setQuery('');
    setOpen(false);
    switch (type) {
      case 'block':
        router.push(`/explorer/${chain}/blocks/${trimmed}`);
        break;
      case 'tx':
        router.push(`/explorer/${chain}/txs/${trimmed}`);
        break;
      case 'contract':
        router.push(`/explorer/${chain}/contracts/${trimmed}`);
        break;
      case 'account':
        router.push(`/explorer/${chain}/accounts/${trimmed}`);
        break;
      default:
        router.push(`/explorer/${chain}/txs/${trimmed}`);
    }
  }, [chain, router]);

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: fullWidth ? '100%' : { xs: '100%', sm: 380, md: 480 } }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            '&:focus-within': {
              borderColor: theme.palette.primary.main,
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.15)}`,
            },
            transition: 'box-shadow 0.2s, border-color 0.2s',
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1, flexShrink: 0 }} />
          <InputBase
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.length > 0); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate(query);
              if (e.key === 'Escape') { setOpen(false); setQuery(''); }
            }}
            placeholder={placeholder}
            fullWidth
            inputProps={{ 'aria-label': 'search' }}
            sx={{ fontSize: '0.85rem' }}
          />
          {query && (
            <IconButton size="small" onClick={() => navigate(query)} sx={{ p: 0.5 }}>
              <SearchIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>

        {open && suggestions.length > 0 && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              zIndex: 9999,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <List dense disablePadding>
              {suggestions.map((s, i) => (
                <ListItem key={i} disablePadding>
                  <ListItemButton onClick={() => navigate(query, s.type)}>
                    <ListItemText
                      primary={s.label}
                      secondary={
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {s.detail}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
