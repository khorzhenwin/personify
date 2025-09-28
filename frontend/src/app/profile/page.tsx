'use client';

import { Container, Title } from '@mantine/core';
import { ProfileSettings } from '@/components/profile/ProfileSettings';
import { AppShellLayout } from '@/components/layout/AppShell';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function ProfilePage() {
  return (
    <AuthGuard>
      <AppShellLayout>
        <Container size="lg" py="xl">
          <Title order={1} mb="xl">Profile Settings</Title>
          <ProfileSettings />
        </Container>
      </AppShellLayout>
    </AuthGuard>
  );
}