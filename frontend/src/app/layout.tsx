'use client';

import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { createAppTheme } from '@/theme';
import { useThemeStore, useSystemColorSchemeDetection } from '@/store/theme';

// Import Mantine styles
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { effectiveColorScheme } = useThemeStore();
  const [theme, setTheme] = useState(() => createAppTheme('light'));

  // Initialize system color scheme detection
  useEffect(() => {
    const cleanup = useSystemColorSchemeDetection();
    return cleanup;
  }, []);

  // Update theme when color scheme changes
  useEffect(() => {
    setTheme(createAppTheme(effectiveColorScheme));
  }, [effectiveColorScheme]);

  return (
    <MantineProvider theme={theme} defaultColorScheme={effectiveColorScheme}>
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <ColorSchemeScript />
        <title>Personal Finance Tracker</title>
        <meta name="description" content="Manage your personal finances with ease" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
