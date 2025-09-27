'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  Switch,
  Card,
  Divider,
  Badge,
  Alert,
  Select,
  ThemeIcon,
  Box
} from '@mantine/core';
import {
  IconBell,
  IconMail,
  IconDeviceMobile,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconWallet,
  IconTrendingUp,
  IconAlertTriangle
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';

interface NotificationSettingsData {
  email_notifications: boolean;
  push_notifications: boolean;
  budget_alerts: boolean;
  transaction_summaries: boolean;
  spending_insights: boolean;
  security_alerts: boolean;
  email_frequency: string;
  budget_threshold: string;
}

export const NotificationSettings = () => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NotificationSettingsData>({
    initialValues: {
      email_notifications: true,
      push_notifications: false,
      budget_alerts: true,
      transaction_summaries: true,
      spending_insights: false,
      security_alerts: true,
      email_frequency: 'weekly',
      budget_threshold: '80'
    }
  });

  const handleSubmit = async (values: NotificationSettingsData) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      notifications.show({
        title: 'Settings Saved',
        message: 'Your notification preferences have been updated',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save notification settings',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setIsLoading(false);
    }
  };

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'never', label: 'Never' }
  ];

  const thresholdOptions = [
    { value: '50', label: '50% of budget' },
    { value: '75', label: '75% of budget' },
    { value: '80', label: '80% of budget' },
    { value: '90', label: '90% of budget' },
    { value: '100', label: '100% of budget (over budget)' }
  ];

  return (
    <Stack gap="xl">
      <Alert color="blue" title="Notification Preferences" icon={<IconInfoCircle size={16} />}>
        Customize how and when you receive notifications about your financial activity.
        You can change these settings at any time.
      </Alert>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          {/* Delivery Methods */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="blue" variant="light">
                  <IconBell size={16} />
                </ThemeIcon>
                <Text fw={500}>Delivery Methods</Text>
              </Group>
              
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconMail size={16} />
                    <Box>
                      <Text size="sm" fw={500}>Email Notifications</Text>
                      <Text size="xs" c="dimmed">Receive notifications via email</Text>
                    </Box>
                  </Group>
                  <Switch
                    {...form.getInputProps('email_notifications', { type: 'checkbox' })}
                  />
                </Group>
                
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconDeviceMobile size={16} />
                    <Box>
                      <Text size="sm" fw={500}>Push Notifications</Text>
                      <Text size="xs" c="dimmed">Browser notifications (when available)</Text>
                    </Box>
                  </Group>
                  <Group gap="sm">
                    <Badge color="orange" variant="light" size="sm">Coming Soon</Badge>
                    <Switch
                      disabled
                      {...form.getInputProps('push_notifications', { type: 'checkbox' })}
                    />
                  </Group>
                </Group>
              </Stack>
            </Stack>
          </Card>

          {/* Notification Types */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="green" variant="light">
                  <IconWallet size={16} />
                </ThemeIcon>
                <Text fw={500}>Financial Notifications</Text>
              </Group>
              
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconAlertTriangle size={16} color="orange" />
                    <Box>
                      <Text size="sm" fw={500}>Budget Alerts</Text>
                      <Text size="xs" c="dimmed">Get notified when approaching budget limits</Text>
                    </Box>
                  </Group>
                  <Switch
                    {...form.getInputProps('budget_alerts', { type: 'checkbox' })}
                  />
                </Group>
                
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconMail size={16} />
                    <Box>
                      <Text size="sm" fw={500}>Transaction Summaries</Text>
                      <Text size="xs" c="dimmed">Regular summaries of your spending activity</Text>
                    </Box>
                  </Group>
                  <Switch
                    {...form.getInputProps('transaction_summaries', { type: 'checkbox' })}
                  />
                </Group>
                
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconTrendingUp size={16} />
                    <Box>
                      <Text size="sm" fw={500}>Spending Insights</Text>
                      <Text size="xs" c="dimmed">Tips and insights about your spending patterns</Text>
                    </Box>
                  </Group>
                  <Switch
                    {...form.getInputProps('spending_insights', { type: 'checkbox' })}
                  />
                </Group>
              </Stack>
            </Stack>
          </Card>

          {/* Security Notifications */}
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="red" variant="light">
                  <IconAlertTriangle size={16} />
                </ThemeIcon>
                <Text fw={500}>Security & Account</Text>
              </Group>
              
              <Group justify="space-between">
                <Box>
                  <Text size="sm" fw={500}>Security Alerts</Text>
                  <Text size="xs" c="dimmed">Important security and account notifications</Text>
                </Box>
                <Group gap="sm">
                  <Badge color="red" variant="light" size="sm">Required</Badge>
                  <Switch
                    checked
                    disabled
                    {...form.getInputProps('security_alerts', { type: 'checkbox' })}
                  />
                </Group>
              </Group>
            </Stack>
          </Card>

          {/* Frequency Settings */}
          {(form.values.email_notifications && (form.values.transaction_summaries || form.values.spending_insights)) && (
            <Card p="md" radius="md" withBorder>
              <Stack gap="md">
                <Text fw={500}>Email Frequency</Text>
                
                <Select
                  label="Summary Email Frequency"
                  description="How often you'd like to receive summary emails"
                  data={frequencyOptions}
                  {...form.getInputProps('email_frequency')}
                />
              </Stack>
            </Card>
          )}

          {/* Budget Alert Settings */}
          {form.values.budget_alerts && (
            <Card p="md" radius="md" withBorder>
              <Stack gap="md">
                <Text fw={500}>Budget Alert Settings</Text>
                
                <Select
                  label="Alert Threshold"
                  description="When to send budget alerts"
                  data={thresholdOptions}
                  {...form.getInputProps('budget_threshold')}
                />
              </Stack>
            </Card>
          )}

          <Group justify="flex-end">
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
              Save Settings
            </Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  );
};