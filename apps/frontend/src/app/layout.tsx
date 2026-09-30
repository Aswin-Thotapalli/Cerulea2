import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import { StudioProvider } from '@/context/StudioContext';
import NavBar from '../components/NavBar';
import Assistant from '@/components/AI/Assistant';
import Background from '@/components/Theme/Background'; // Import the new Background component
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description: 'The AI Layer 1 for the next internet',
};

// Every screen renders per request. The content security policy carries a
// fresh nonce each time, and a page rendered once at build time would carry
// inline scripts with no nonce, which the policy refuses.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <StudioProvider>
            <Background /> {/* This renders the background behind everything */}
            <NavBar />
            {children}
            <Assistant />
          </StudioProvider>
        </Providers>
      </body>
    </html>
  );
}