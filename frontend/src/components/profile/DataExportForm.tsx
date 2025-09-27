'use client';

import { useState } from 'react';
import {
  Stack,
  Group,
  Text,
  Button,
  Select,
  Switch,
  Alert,
  Card,
  Progress,
  Badge,
  Divider,
  List,
  ThemeIcon,
  Box
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconDownload,
  IconFileText,
  IconDatabase,
  IconCalendar,
  IconCheck,
  IconX,
  IconInfoCircle
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/store/auth';

interface DataExportData {
  format: string;
  date_from: Date | null;
  date_to: Date | null;
  include_categories: boolean;
  include_budgets: boolean;
}

export const DataExportForm = () => {
  const { exportData } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const form = useForm<DataExportData>({
    initialValues: {
      format: 'csv',
      date_from: null,
      date_to: null,
      include_categories: true,
      include_budgets: true
    },
    validate: {
      date_from: (value, values) => {
        if (value && values.date_to && value > values.date_to) {
          return 'Start date must be before end date';
        }
        return null;
      },
      date_to: (value, values) => {
        if (value && values.date_from && value < values.date_from) {
          return 'End date must be after start date';
        }
        return null;
      }
    }
  });

  const handleSubmit = async (values: DataExportData) => {
    setIsLoading(true);
    setExportProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setExportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const exportPayload = {
        ...values,
        date_from: values.date_from?.toISOString().split('T')[0] || undefined,
        date_to: values.date_to?.toISOString().split('T')[0] || undefined
      };

      await exportData(exportPayload);
      
      setExportProgress(100);
      
      notifications.show({
        title: 'Export Complete',
        message: 'Your data has been exported successfully',
        color: 'green',
        icon: <IconCheck size={16} />
      });
    } catch (error: any) {
      clearInterval(progressInterval);
      setExportProgress(0);
      
      notifications.show({
        title: 'Export Failed',
        message: error.message || 'Failed to export data',
        color: 'red',
        icon: <IconX size={16} />
      });
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const formatOptions = [
    { value: 'csv', label: 'CSV (Comma Separated Values)' },
    { value: 'json', label: 'JSON (JavaScript Object Notation)' }
  ];

  return (
    <Stack gap="xl">
      <Alert color="blue" title="Data Export" icon={<IconInfoCircle size={16} />}>
        Export your financial data for backup, analysis, or migration purposes. 
        All exported data is filtered to include only your personal information.
      </Alert>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="lg">
          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="blue" variant="light">
                  <IconFileText size={16} />
                </ThemeIcon>
                <Text fw={500}>Export Format</Text>
              </Group>
              
              <Select
                label="File Format"
                placeholder="Choose export format"
                data={formatOptions}
                {...form.getInputProps('format')}
                required
              />
              
              <Text size="sm" c="dimmed">
                {form.values.format === 'csv' 
                  ? 'CSV format is ideal for spreadsheet applications like Excel or Google Sheets.'
                  : 'JSON format is perfect for developers and data analysis tools.'
                }
              </Text>
            </Stack>
          </Card>

          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="green" variant="light">
                  <IconCalendar size={16} />
                </ThemeIcon>
                <Text fw={500}>Date Range (Optional)</Text>
              </Group>
              
              <Group grow>
                <DatePickerInput
                  label="From Date"
                  placeholder="Select start date"
                  leftSection={<IconCalendar size={16} />}
                  clearable
                  {...form.getInputProps('date_from')}
                />
                <DatePickerInput
                  label="To Date"
                  placeholder="Select end date"
                  leftSection={<IconCalendar size={16} />}
                  clearable
                  {...form.getInputProps('date_to')}
                />
              </Group>
              
              <Text size="sm" c="dimmed">
                Leave empty to export all data, or specify a date range to limit the export.
              </Text>
            </Stack>
          </Card>

          <Card p="md" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <ThemeIcon color="orange" variant="light">
                  <IconDatabase size={16} />
                </ThemeIcon>
                <Text fw={500}>Data Types</Text>
              </Group>
              
              <Stack gap="sm">
                <Group justify="space-between">
                  <Box>
                    <Text size="sm" fw={500}>Transactions</Text>
                    <Text size="xs" c="dimmed">All your income and expense records</Text>
                  </Box>
                  <Badge color="blue" variant="light">Always Included</Badge>
                </Group>
                
                <Switch
                  label="Categories"
                  description="Your custom transaction categories"
                  {...form.getInputProps('include_categories', { type: 'checkbox' })}
                />
                
                <Switch
                  label="Budgets"
                  description="Your monthly budget settings"
                  {...form.getInputProps('include_budgets', { type: 'checkbox' })}
                />
              </Stack>
            </Stack>
          </Card>

          {isLoading && (
            <Card p="md" radius="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500}>Exporting Data...</Text>
                  <Text size="sm" c="dimmed">{exportProgress}%</Text>
                </Group>
                <Progress value={exportProgress} animated />
                <Text size="sm" c="dimmed">
                  {exportProgress < 30 && 'Preparing your data...'}
                  {exportProgress >= 30 && exportProgress < 60 && 'Processing transactions...'}
                  {exportProgress >= 60 && exportProgress < 90 && 'Generating export file...'}
                  {exportProgress >= 90 && exportProgress < 100 && 'Finalizing download...'}
                  {exportProgress === 100 && 'Export complete!'}
                </Text>
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
              leftSection={<IconDownload size={16} />}
            >
              Export Data
            </Button>
          </Group>
        </Stack>
      </form>

      <Divider />

      <Card p="md" radius="md" withBorder>
        <Stack gap="sm">
          <Text fw={500} size="sm">Export Information</Text>
          <List size="xs" spacing="xs">
            <List.Item>Exported files contain only your personal data</List.Item>
            <List.Item>CSV exports are provided as a ZIP file with separate files for each data type</List.Item>
            <List.Item>JSON exports contain all data in a single structured file</List.Item>
            <List.Item>All sensitive information is included - store exported files securely</List.Item>
          </List>
        </Stack>
      </Card>
    </Stack>
  );
};