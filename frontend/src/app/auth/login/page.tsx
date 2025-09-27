'use client';

import { Center, Container } from '@mantine/core';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { LoginForm } from '@/components/auth/LoginForm';
import { designTokens } from '@/theme';

export default function LoginPage() {
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
          <LoginForm />
        </Center>
      </Container>
    </AuthGuard>
  );
}