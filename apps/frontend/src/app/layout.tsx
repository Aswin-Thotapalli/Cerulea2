import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import StudioShell from './StudioShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description: 'The AI Layer 1 for the next internet',
  icons: {
    icon: [{ url: '/brand/favicon-v2.png?v=3', type: 'image/png' }],
    shortcut: '/brand/favicon-v2.png?v=3',
    apple: '/brand/favicon-v2.png',
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