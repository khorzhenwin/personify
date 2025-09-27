'use client';

import { Container, Title } from '@mantine/core';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

export default function ProfilePage() {
  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="xl">Profile Settings</Title>
      <ProfileSettings />
    </Container>
  );
}