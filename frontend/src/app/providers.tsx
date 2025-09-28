'use client';

import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createAppTheme } from '@/theme';
import { useThemeStore, useSystemColorSchemeDetection } from '@/store/theme';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { effectiveColorScheme } = useThemeStore();
  const [theme, setTheme] = useState(() => createAppTheme('light'));
  const [mounted, setMounted] = useState(false);

  // Initialize system color scheme detection
  useSystemColorSchemeDetection();

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update theme when color scheme changes
  useEffect(() => {
    if (mounted) {
      setTheme(createAppTheme(effectiveColorScheme));
    }
  }, [effectiveColorScheme, mounted]);

  // Force light theme for now to fix contrast issues
  const currentTheme = createAppTheme('light');
  const currentColorScheme = 'light';

  return (
    <MantineProvider theme={currentTheme} defaultColorScheme={currentColorScheme} forceColorScheme={currentColorScheme}>
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
