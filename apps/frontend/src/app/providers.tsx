'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createContext, useEffect, useState, useMemo, ReactNode, useContext } from 'react';
import { SessionProvider } from 'next-auth/react';
import { finalLightTheme, finalDarkTheme } from '@/theme/theme';
import { MessagesProvider } from '@/lib/messages/MessagesProvider';

export const ThemeContext = createContext({
  toggleTheme: () => {},
});

export const useThemeToggle = () => useContext(ThemeContext);

/** The key the chosen mode lives under on this browser. */
const modeStorageKey = 'cerulea.studio.mode';

function storeMode(mode: 'light' | 'dark'): void {
  try {
    window.localStorage.setItem(modeStorageKey, mode);
  } catch {
    // The browser refuses storage in private reading. The choice holds for this visit.
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  // A stored choice leads. A person who never chose receives the mode the
  // device asks for.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(modeStorageKey);
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
        return;
      }
    } catch {
      return;
    }
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setMode('dark');
    }
  }, []);

  const themeToggle = useMemo(
    () => ({
      toggleTheme: () => {
        setMode((prevMode) => {
          const next = prevMode === 'light' ? 'dark' : 'light';
          storeMode(next);
          return next;
        });
      },
    }),
    []
  );

  const theme = useMemo(() => (mode === 'light' ? finalLightTheme : finalDarkTheme), [mode]);

  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <ThemeContext.Provider value={themeToggle}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <MessagesProvider>{children}</MessagesProvider>
        </ThemeProvider>
      </ThemeContext.Provider>
    </SessionProvider>
  );
}

