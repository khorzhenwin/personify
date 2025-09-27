'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader, Text, Stack } from '@mantine/core';
import { useAuthStore } from '@/store/auth';
import { designTokens } from '@/theme';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Wait for hydration to complete
    const timer = setTimeout(() => {
      if (requireAuth && !isAuthenticated && !isLoading) {
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        router.push('/dashboard');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router]);

  // Show loading state while checking authentication
  if (isLoading || (requireAuth && !isAuthenticated)) {
    return (
      <Center 
        style={{ 
          height: '100vh',
          backgroundColor: designTokens.colors.gray[50],
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="lg" color="primary" />
          <Text size="sm" c="dimmed">
            {isLoading ? 'Loading...' : 'Redirecting...'}
          </Text>
        </Stack>
      </Center>
    );
  }

  // Don't render children if auth requirements aren't met
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (!requireAuth && isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}