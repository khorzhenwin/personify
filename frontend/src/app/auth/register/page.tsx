'use client';

import { Center, Container } from '@mantine/core';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RegistrationForm } from '@/components/auth/RegistrationForm';
import { designTokens } from '@/theme';

export default function RegisterPage() {
  return (
    <AuthGuard requireAuth={false}>
      <Container
        size="sm"
        style={{
          minHeight: '100vh',
          backgroundColor: designTokens.colors.gray[50],
        }}
      >
        <Center style={{ minHeight: '100vh' }}>
          <RegistrationForm />
        </Center>
      </Container>
    </AuthGuard>
  );
}