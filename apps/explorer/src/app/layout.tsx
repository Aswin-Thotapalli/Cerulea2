import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { getServerSession } from 'next-auth';
import Providers from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Cerulea Explorer', template: '%s | Cerulea Explorer' },
  description: 'Explore blocks, transactions, accounts, and contracts on the Cerulea blockchain network.',
  metadataBase: new URL('https://explorer.cerulea.io'),
  openGraph: {
    title: 'Cerulea Explorer',
    description: 'Real-time blockchain explorer for the Cerulea network',
    siteName: 'Cerulea Explorer',
    locale: 'en_US',
    type: 'website',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
