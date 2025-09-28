'use client';

import { Container, Title, Stack } from '@mantine/core';
import { AppShellLayout } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AnalyticsDashboard } from '@/components/analytics';

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <AppShellLayout>
        <Container size="xl" py="xl">
          <Stack gap="xl">
            <Title order={1}>Analytics</Title>
            <AnalyticsDashboard />
          </Stack>
        </Container>
      </AppShellLayout>
    </AuthGuard>
  );
}
