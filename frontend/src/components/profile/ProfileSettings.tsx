'use client';

import { useState } from 'react';
import {
  Tabs,
  Card,
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  PasswordInput,
  Select,
  Switch,
  Progress,
  Alert,
  Avatar,
  FileButton,
  Badge,
  Divider,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import {
  IconUser,
  IconLock,
  IconDownload,
  IconBell,
  IconCamera,
  IconCheck,
  IconX,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';
import { ProfileForm } from './ProfileForm';
import { PasswordChangeForm } from './PasswordChangeForm';
import { DataExportForm } from './DataExportForm';
import { NotificationSettings } from './NotificationSettings';

export const ProfileSettings = () => {
  const [activeTab, setActiveTab] = useState<string | null>('profile');
  const { user } = useAuthStore();

  return (
    <Card radius="md" className="modern-card">
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills">
        <Tabs.List grow>
          <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
            Profile
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
            Security
          </Tabs.Tab>
          <Tabs.Tab value="export" leftSection={<IconDownload size={16} />}>
            Data Export
          </Tabs.Tab>
          <Tabs.Tab value="notifications" leftSection={<IconBell size={16} />}>
            Notifications
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="profile" pt="xl">
          <ProfileForm />
        </Tabs.Panel>

        <Tabs.Panel value="security" pt="xl">
          <PasswordChangeForm />
        </Tabs.Panel>

        <Tabs.Panel value="export" pt="xl">
          <DataExportForm />
        </Tabs.Panel>

        <Tabs.Panel value="notifications" pt="xl">
          <NotificationSettings />
        </Tabs.Panel>
      </Tabs>
    </Card>
  );
};