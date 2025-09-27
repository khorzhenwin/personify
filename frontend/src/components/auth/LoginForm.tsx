'use client';

import { useState } from 'react';
import {
  Card,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Alert,
  Anchor,
  Group,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconMail, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, LoginCredentials } from '@/store/auth';
import { designTokens } from '@/theme';

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, error, clearError } = useAuthStore();
  const router = useRouter();

  const form = useForm<LoginCredentials>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => {
        if (!value) return 'Email is required';
        if (!/^\S+@\S+$/.test(value)) return 'Invalid email format';
        return null;
      },
      password: (value) => {
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
      },
    },
  });

  const handleSubmit = async (values: LoginCredentials) => {
    try {
      setIsSubmitting(true);
      clearError();
      await login(values);
      router.push('/dashboard');
    } catch (error) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="lg"
      style={{
        width: '100%',
        maxWidth: '400px',
        border: `1px solid ${designTokens.colors.gray[200]}`,
      }}
    >
      <Stack gap="lg">
        <Stack gap="xs" align="center">
          <Title 
            order={2} 
            ta="center"
            style={{ 
              color: designTokens.colors.gray[800],
              fontWeight: designTokens.typography.fontWeight.bold,
            }}
          >
            Welcome Back
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            Sign in to your account to continue
          </Text>
        </Stack>

        {error && (
          <Alert 
            icon={<IconAlertCircle size={16} />} 
            color="red" 
            variant="light"
            radius="md"
          >
            {error}
          </Alert>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="Enter your email"
              leftSection={<IconMail size={16} />}
              required
              {...form.getInputProps('email')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />

            <PasswordInput
              label="Password"
              placeholder="Enter your password"
              leftSection={<IconLock size={16} />}
              required
              {...form.getInputProps('password')}
              styles={{
                label: {
                  fontWeight: designTokens.typography.fontWeight.medium,
                  marginBottom: designTokens.spacing.xs,
                },
              }}
            />

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              size="md"
              style={{
                marginTop: designTokens.spacing.sm,
              }}
            >
              Sign In
            </Button>
          </Stack>
        </form>

        <Group justify="center" gap="xs">
          <Text size="sm" c="dimmed">
            Don&apos;t have an account?
          </Text>
          <Anchor component={Link} href="/auth/register" size="sm">
            Sign up
          </Anchor>
        </Group>
      </Stack>
    </Card>
  );
}