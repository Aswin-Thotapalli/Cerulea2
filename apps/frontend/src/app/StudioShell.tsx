'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { StudioProvider } from '@/context/StudioContext';
import NavBar from '../components/NavBar';
import Assistant from '@/components/AI/Assistant';
import Background from '@/components/Theme/Background';

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith('/explorer')) {
    return <>{children}</>;
  }
  return (
    <StudioProvider>
      <Background />
      <NavBar />
      {children}
      <Assistant />
    </StudioProvider>
  );
}
