import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import StudioShell from './StudioShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description: 'The AI Layer 1 for the next internet',
  icons: {
    icon: '/brand/logo-light.png',
    shortcut: '/brand/logo-light.png',
    apple: '/brand/logo-light.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>
          <StudioShell>
            {children}
          </StudioShell>
        </Providers>
      </body>
    </html>
  );
}