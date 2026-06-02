import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Cerulea Explorer', template: '%s | Cerulea Explorer' },
  description: 'Explore blocks, transactions, accounts, and contracts on the Cerulea blockchain network.',
};

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
