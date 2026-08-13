'use client';

import { Box } from '@mui/material';
import type { ChainSlug } from '@cerulea/types';
import { ChainProvider } from '@/context/ChainContext';
import { WsProvider } from '@/context/WsContext';

interface ChainProvidersProps {
  chain: ChainSlug;
  children: React.ReactNode;
}

export default function ChainProviders({ chain, children }: ChainProvidersProps) {
  return (
    <ChainProvider chain={chain}>
      <WsProvider chain={chain}>
        {/* Paint an opaque, theme-aware backdrop over the app's hardcoded dark
            <html> background so light mode is actually light everywhere. */}
        <Box sx={{ bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh' }}>
          {children}
        </Box>
      </WsProvider>
    </ChainProvider>
  );
}
