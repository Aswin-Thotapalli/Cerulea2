'use client';

import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createContext, useState, useMemo, ReactNode, useContext } from 'react';
import { finalLightTheme, finalDarkTheme } from '@/theme/theme';

// Create a context to provide the theme toggle function
export const ThemeContext = createContext({
  toggleTheme: () => {},
});

export const useThemeToggle = () => useContext(ThemeContext);

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  const themeToggle = useMemo(
    () => ({
      toggleTheme: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
    }),
    []
  );

  const theme = useMemo(() => (mode === 'light' ? finalLightTheme : finalDarkTheme), [mode]);

  return (
    <ThemeContext.Provider value={themeToggle}>
      <ThemeProvider theme={theme}>
        {/* CssBaseline applies the background color from the theme and other resets */}
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

