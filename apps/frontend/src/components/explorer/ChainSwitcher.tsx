'use client';

import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter, usePathname } from 'next/navigation';
import type { ChainSlug } from '@cerulea/types';
import { CHAINS } from '@/lib/explorer/chains';

interface ChainSwitcherProps {
  currentChain: ChainSlug;
}

export default function ChainSwitcher({ currentChain }: ChainSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (_: React.MouseEvent, value: ChainSlug | null) => {
    if (!value || value === currentChain) return;
    // Path is /explorer/[chain]/... so chain is at index 2
    const segments = pathname.split('/');
    segments[2] = value;
    router.push(segments.join('/'));
  };

  return (
    <ToggleButtonGroup
      value={currentChain}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        p: '2px',
        borderRadius: '999px',
        bgcolor: 'action.hover',
        '& .MuiToggleButtonGroup-grouped': {
          m: 0,
          border: '0 !important',
          borderRadius: '999px !important',
        },
        '& .MuiToggleButton-root': {
          px: 1.5,
          py: 0.35,
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'none',
          letterSpacing: 0,
          color: 'text.secondary',
          gap: 0.5,
          '&:hover': { bgcolor: 'transparent', color: 'text.primary' },
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 1,
            '&:hover': { bgcolor: 'primary.dark' },
          },
        },
      }}
    >
      {Object.values(CHAINS).map((chain) => (
        <Tooltip key={chain.slug} title={chain.permissioned ? 'Private permissioned chain' : 'Public chain'}>
          <ToggleButton value={chain.slug} aria-label={chain.name}>
            {chain.permissioned ? <LockIcon sx={{ fontSize: 13 }} /> : <PublicIcon sx={{ fontSize: 13 }} />}
            {chain.permissioned ? 'Private' : 'Public'}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}
