import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { Providers } from './providers';
import StudioShell from './StudioShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cerulea Studio',
  description: 'The AI Layer 1 for the next internet',
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