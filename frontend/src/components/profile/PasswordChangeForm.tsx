'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  PasswordInput,
  Progress,
  Alert,
  List,
  ThemeIcon,
  Box
} from '@mantine/core';
import {
  IconLock,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff,
  IconShieldCheck
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';

interface PasswordChangeData {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

const getPasswordStrength = (password: string): number => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (/[a-z]/.test(password)) strength += 25;
  if (/[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password)) strength += 25;
  if (/[^A-Za-z0-9]/.test(password)) strength += 25;
  return Math.min(strength, 100);
};

const getPasswordStrengthColor = (strength: number): string => {
  if (strength < 50) return 'red';
  if (strength < 75) return 'yellow';
  return 'green';
};

const getPasswordStrengthLabel = (strength: number): string => {
  if (strength < 25) return 'Very Weak';
  if (strength < 50) return 'Weak';
  if (strength < 75) return 'Good';
  if (strength < 100) return 'Strong';
  return 'Very Strong';
};

export const PasswordChangeForm = () => {
  const { changePassword } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<PasswordChangeData>({
    initialValues: {
      current_password: '',
      new_password: '',
      new_password_confirm: ''
    },
    validate: {
      current_password: (value) => (!value ? 'Current password is required' : null),
      new_password: (value) => {
        if (!value) return 'New password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;
      },
      new_password_confirm: (value, values) => {
        if (!value) return 'Please confirm your new password';
        if (value !== values.new_password) return 'Passwords do not match';
        return null;
      }
    }
  });

  const passwordStrength = getPasswordStrength(form.values.new_password);
  const strengthColor = getPasswordStrengthColor(passwordStrength);
  const strengthLabel = getPasswordStrengthLabel(passwordStrength);

  const handleSubmit = async (values: PasswordChangeData) => {
    setIsLoading(true);
    try {
      await changePassword(values);
      notifications.show({
        title: 'Success',
        message: 'Password changed successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });
      form.reset();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to change password',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordRequirements = [
    { re: /.{8,}/, label: 'At least 8 characters' },
    { re: /[a-z]/, label: 'Contains lowercase letter' },
    { re: /[A-Z]/, label: 'Contains uppercase letter' },
    { re: /[0-9]/, label: 'Contains number' },
    { re: /[^A-Za-z0-9]/, label: 'Contains special character' }
  ];

  return (
    <Stack gap="xl">
      <Alert color="blue" title="Password Security" icon={<IconShieldCheck size={16} />}>
        Choose a strong password to keep your account secure. Your password should be unique 
        and not used on other websites.
      </Alert>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <PasswordInput
            label="Current Password"
            placeholder="Enter your current password"
            leftSection={<IconLock size={16} />}
            visible={showCurrentPassword}
            onVisibilityChange={setShowCurrentPassword}
            {...form.getInputProps('current_password')}
            required
          />

          <PasswordInput
            label="New Password"
            placeholder="Enter your new password"
            leftSection={<IconLock size={16} />}
            visible={showNewPassword}
            onVisibilityChange={setShowNewPassword}
            {...form.getInputProps('new_password')}
            required
          />

          {form.values.new_password && (
            <Box>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  Password Strength
                </Text>
                <Text size="sm" c={strengthColor} fw={500}>
                  {strengthLabel}
                </Text>
              </Group>
              <Progress
                value={passwordStrength}
                color={strengthColor}
                size="sm"
                mb="md"
              />
              
              <Text size="sm" mb="xs" fw={500}>
                Password Requirements:
              </Text>
              <List size="sm" spacing="xs">
                {passwordRequirements.map((requirement, index) => (
                  <List.Item
                    key={index}
                    icon={
                      <ThemeIcon
                        color={requirement.re.test(form.values.new_password) ? 'green' : 'gray'}
                        size={16}
                        radius="xl"
                      >
                        <IconCheck size={10} />
                      </ThemeIcon>
                    }
                  >
                    <Text
                      c={requirement.re.test(form.values.new_password) ? 'green' : 'dimmed'}
                      size="sm"
                    >
                      {requirement.label}
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Box>
          )}

          <PasswordInput
            label="Confirm New Password"
            placeholder="Confirm your new password"
            leftSection={<IconLock size={16} />}
            visible={showConfirmPassword}
            onVisibilityChange={setShowConfirmPassword}
            {...form.getInputProps('new_password_confirm')}
            required
          />

          <Group justify="flex-end" mt="xl">
            <Button
              type="button"
              variant="light"
              onClick={() => form.reset()}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              loading={isLoading}
              leftSection={<IconCheck size={16} />}
              disabled={passwordStrength < 50}
            >
              Change Password
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
};