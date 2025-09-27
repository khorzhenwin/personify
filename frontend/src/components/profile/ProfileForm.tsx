'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Avatar,
  FileButton,
  Alert,
  ActionIcon,
  Tooltip,
  Box
} from '@mantine/core';
import {
  IconCamera,
  IconCheck,
  IconX,
  IconUser
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';

interface ProfileFormData {
  first_name: string;
  last_name: string;
}

export const ProfileForm = () => {
  const { user, updateProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    initialValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || ''
    },
    validate: {
      first_name: (value) => (!value?.trim() ? 'First name is required' : null),
      last_name: (value) => (!value?.trim() ? 'Last name is required' : null)
    }
  });

  const handleAvatarChange = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(null);
    }
  };

  const handleSubmit = async (values: ProfileFormData) => {
    setIsLoading(true);
    try {
      await updateProfile(values);
      notifications.show({
        title: 'Success',
        message: 'Profile updated successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to update profile',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    const firstName = form.values.first_name || user?.first_name || '';
    const lastName = form.values.last_name || user?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Stack gap="xl">
      <Group align="center" gap="xl">
        <Box pos="relative">
          <Avatar
            size={80}
            radius="md"
            src={avatarPreview}
            color="blue"
          >
            {!avatarPreview && getInitials()}
          </Avatar>
          <FileButton
            onChange={handleAvatarChange}
            accept="image/png,image/jpeg,image/jpg"
          >
            {(props) => (
              <Tooltip label="Upload avatar">
                <ActionIcon
                  {...props}
                  size="sm"
                  radius="xl"
                  variant="filled"
                  color="blue"
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    border: '2px solid white'
                  }}
                >
                  <IconCamera size={12} />
                </ActionIcon>
              </Tooltip>
            )}
          </FileButton>
        </Box>
        
        <Stack gap="xs" flex={1}>
          <Text size="lg" fw={600}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text size="sm" c="dimmed">
            {user?.email}
          </Text>
          {avatarFile && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                New avatar selected: {avatarFile.name}
              </Text>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="red"
                onClick={() => handleAvatarChange(null)}
              >
                <IconX size={12} />
              </ActionIcon>
            </Group>
          )}
        </Stack>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Group grow>
            <TextInput
              label="First Name"
              placeholder="Enter your first name"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('first_name')}
              required
            />
            <TextInput
              label="Last Name"
              placeholder="Enter your last name"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps('last_name')}
              required
            />
          </Group>

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
            >
              Update Profile
            </Button>
          </Group>
        </Stack>
      </form>

      {avatarFile && (
        <Alert color="blue" title="Avatar Upload">
          Avatar upload functionality will be implemented in a future update.
          For now, you can select an image to preview how it would look.
        </Alert>
      )}
    </Stack>
  );
};