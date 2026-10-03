import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import StudioShell from './StudioShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description:
    'Cerulea Studio builds a private Blockchain network or a decentralised application without code.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180' },
  },
};

// Every screen renders per request. The content security policy carries a
// fresh nonce each time, and a page rendered once at build time would carry
// inline scripts with no nonce, which the policy refuses.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {/*
          The style cache gathers every style the server renders into the head.
          Without it each component writes its own style element into the body,
          and React meets elements on the client the server never placed there.
        */}
        <AppRouterCacheProvider options={{ key: 'css' }}>
          <Providers>
            <StudioShell>
              {children}
            </StudioShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
