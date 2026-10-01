import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import { StudioProvider } from '@/context/StudioContext';
import NavBar from '../components/NavBar';
import Assistant from '@/components/AI/Assistant';
import Background from '@/components/Theme/Background';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description:
    'Cerulea Studio builds a private Blockchain network or a decentralised application without code.',
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
            <StudioProvider>
              <Background />
              <NavBar />
              {children}
              <Assistant />
            </StudioProvider>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
