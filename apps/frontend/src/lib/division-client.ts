'use client';

import * as React from 'react';
import { divisionFromPath, lockedProjectType, type Division } from '@/config/divisions';

// Reads the active division on the client. The URL path is authoritative for the
// currently-open division (it's preserved through the studio flow), so it wins;
// the cerulea.division cookie set by middleware is the fallback.
export function getClientDivision(): Division | null {
  if (typeof window !== 'undefined') {
    const fromPath = divisionFromPath(window.location.pathname);
    if (fromPath) return fromPath;
  }
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)cerulea\.division=([^;]+)/);
    if (m) {
      const v = decodeURIComponent(m[1]);
      if (v === 'dapp' || v === 'enterprise' || v === 'govt') return v;
    }
  }
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
