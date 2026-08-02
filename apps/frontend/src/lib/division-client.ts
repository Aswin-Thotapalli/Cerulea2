'use client';

import * as React from 'react';
import { divisionFromHost, lockedProjectType, type Division } from '@/config/divisions';

// Reads the active division on the client. Priority: the cerulea.division cookie
// (set by middleware on every division-host request) → the current hostname.
export function getClientDivision(): Division | null {
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)cerulea\.division=([^;]+)/);
    if (m) {
      const v = decodeURIComponent(m[1]);
      if (v === 'dapp' || v === 'enterprise' || v === 'govt') return v;
    }
  }
  if (typeof window !== 'undefined') return divisionFromHost(window.location.host);
  return null;
}

/** React hook: the active division (null until mounted / undetermined). */
export function useDivision(): Division | null {
  const [division, setDivision] = React.useState<Division | null>(null);
  React.useEffect(() => { setDivision(getClientDivision()); }, []);
  return division;
}

/** The project type the current division locks the studio to (null = user chooses). */
export function useLockedProjectType(): 'dapp' | 'blockchain' | null {
  const division = useDivision();
  return division ? lockedProjectType(division) : null;
}
