'use client';

import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter, usePathname } from 'next/navigation';
import type { ChainSlug } from '@cerulea/types';
import { CHAINS } from '@/lib/chains';

interface ChainSwitcherProps {
  currentChain: ChainSlug;
}

export default function ChainSwitcher({ currentChain }: ChainSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (_: React.MouseEvent, value: ChainSlug | null) => {
    if (!value || value === currentChain) return;
    // Swap the chain segment in the current path
    const segments = pathname.split('/');
    segments[1] = value;
    router.push(segments.join('/'));
  };

  return (
    <ToggleButtonGroup
      value={currentChain}
      exclusive
      onChange={handleChange}
      size="small"
      sx={{
        '& .MuiToggleButton-root': {
          px: 1.5,
          py: 0.4,
          fontSize: '0.75rem',
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: '999px !important',
          border: '1px solid',
          borderColor: 'divider',
          gap: 0.5,
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderColor: 'primary.main',
            '&:hover': { bgcolor: 'primary.dark' },
          },
        },
        gap: 0.5,
        border: 'none',
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: 'divider',
          '&:not(:first-of-type)': { borderLeft: '1px solid', borderColor: 'divider', ml: 0 },
        },
      }}
    >
      {Object.values(CHAINS).map((chain) => (
        <Tooltip key={chain.slug} title={chain.permissioned ? 'Private permissioned chain' : 'Public chain'}>
          <ToggleButton value={chain.slug} aria-label={chain.name}>
            {chain.permissioned ? <LockIcon sx={{ fontSize: 14 }} /> : <PublicIcon sx={{ fontSize: 14 }} />}
            {chain.name}
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  );
}
