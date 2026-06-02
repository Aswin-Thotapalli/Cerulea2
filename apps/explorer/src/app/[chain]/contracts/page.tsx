'use client';

import {
  Box, Typography, Paper, TextField, Button,
  InputAdornment, Divider, List, ListItem, ListItemButton,
  ListItemText, Chip, Skeleton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { alpha, useTheme } from '@mui/material/styles';
import HashChip from '@/components/HashChip';
import { useChainContext } from '@/context/ChainContext';

export default function ContractsPage() {
  const { chain } = useChainContext();
  const router = useRouter();
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    const trimmed = query.trim();
    if (trimmed) router.push(`/${chain}/contracts/${trimmed}`);
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, py: 4 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>Contracts</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Look up deployed smart contracts by address. Verified contracts show source code and ABI.
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 3, p: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          Contract Lookup
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Enter contract address (0x… or SS58)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: { borderRadius: 999, fontFamily: 'monospace', fontSize: '0.85rem' },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={!query.trim()}
            sx={{ borderRadius: 999, fontWeight: 700, px: 3, textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Look Up
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box
              component="a"
              href={`/${chain}/contracts/verify`}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                px: 2, py: 0.75, borderRadius: 999,
                border: `1px solid ${theme.palette.divider}`,
                textDecoration: 'none', color: 'primary.main',
                fontSize: '0.82rem', fontWeight: 600,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              Verify a Contract →
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
