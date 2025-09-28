'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Center, Loader, Stack, Text } from '@mantine/core';
import { useAuthStore } from '@/store/auth';
import { designTokens } from '@/theme';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const timer = setTimeout(() => {
      if (!isLoading) {
        if (isAuthenticated) {
          router.push('/dashboard');
        } else {
          router.push('/auth/login');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, router, mounted]);

  if (!mounted) {
    return (
      <Center style={{ height: '100vh' }}>
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text size="sm">Loading...</Text>
        </Stack>
      </Center>
    );
  }

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
          Loading Personal Finance Tracker...
        </Text>
      </Stack>
    </Center>
  );
}