'use client';

import { Box, Skeleton, Stack, Group, Card, Grid } from '@mantine/core';
import { designTokens } from '@/theme';

interface LoadingSpinnerProps {
  variant?: 'default' | 'card' | 'table' | 'dashboard' | 'chart';
  count?: number;
}

export function LoadingSpinner({ variant = 'default', count = 1 }: LoadingSpinnerProps) {
  if (variant === 'card') {
    return (
      <Stack gap="md">
        {Array.from({ length: count }).map((_, index) => (
          <Card key={index} padding="lg" radius="lg" withBorder>
            <Stack gap="sm">
              <Group justify="space-between">
                <Skeleton height={20} width="40%" radius="sm" />
                <Skeleton height={16} width="20%" radius="sm" />
              </Group>
              <Skeleton height={14} width="80%" radius="sm" />
              <Skeleton height={14} width="60%" radius="sm" />
              <Group gap="sm" mt="md">
                <Skeleton height={32} width={80} radius="md" />
                <Skeleton height={32} width={80} radius="md" />
              </Group>
            </Stack>
          </Card>
        ))}
      </Stack>
    );
  }

  if (variant === 'table') {
    return (
      <Stack gap="xs">
        {Array.from({ length: count }).map((_, index) => (
          <Group key={index} justify="space-between" p="md" style={{ borderBottom: '1px solid #eee' }}>
            <Group gap="md">
              <Skeleton height={40} width={40} radius="sm" />
              <Stack gap="xs">
                <Skeleton height={16} width={120} radius="sm" />
                <Skeleton height={12} width={80} radius="sm" />
              </Stack>
            </Group>
            <Group gap="md">
              <Skeleton height={16} width={60} radius="sm" />
              <Skeleton height={16} width={80} radius="sm" />
              <Skeleton height={32} width={32} radius="sm" />
            </Group>
          </Group>
        ))}
      </Stack>
    );
  }

  if (variant === 'dashboard') {
    return (
      <Stack gap="xl">
        {/* Stats Cards */}
        <Grid>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid.Col key={index} span={{ base: 12, sm: 6, md: 3 }}>
              <Card padding="lg" radius="lg" withBorder>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Skeleton height={16} width="60%" radius="sm" />
                    <Skeleton height={24} width={24} radius="sm" />
                  </Group>
                  <Skeleton height={32} width="80%" radius="sm" />
                  <Skeleton height={12} width="40%" radius="sm" />
                </Stack>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {/* Charts */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Card padding="lg" radius="lg" withBorder>
              <Stack gap="md">
                <Skeleton height={20} width="30%" radius="sm" />
                <Skeleton height={300} radius="md" />
              </Stack>
            </Card>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card padding="lg" radius="lg" withBorder>
              <Stack gap="md">
                <Skeleton height={20} width="40%" radius="sm" />
                <Skeleton height={200} radius="md" />
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    );
  }

  if (variant === 'chart') {
    return (
      <Card padding="lg" radius="lg" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Skeleton height={24} width="30%" radius="sm" />
            <Skeleton height={32} width={100} radius="md" />
          </Group>
          <Skeleton height={300} radius="md" />
          <Group justify="center" gap="md">
            {Array.from({ length: 4 }).map((_, index) => (
              <Group key={index} gap="xs">
                <Skeleton height={12} width={12} radius="sm" />
                <Skeleton height={12} width={60} radius="sm" />
              </Group>
            ))}
          </Group>
        </Stack>
      </Card>
    );
  }

  // Default spinner
  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
      }}
      data-testid="loading-skeleton"
    >
      <Box
        style={{
          width: 40,
          height: 40,
          border: `3px solid ${designTokens.colors.gray[200]}`,
          borderTop: `3px solid ${designTokens.colors.primary}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}

// Pulse animation for skeleton loading
export function PulseLoader({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={{
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
    >
      {children}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </Box>
  );
}