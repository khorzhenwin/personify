'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  Stack,
  Title,
  Text,
  Group,
  Button,
  ActionIcon,
  Alert,
  Badge,
  Box,
  Center,
  Skeleton,
  Divider,
} from '@mantine/core';
import { 
  IconAlertTriangle, 
  IconAlertCircle, 
  IconX, 
  IconEdit,
  IconEye,
  IconCheck
} from '@tabler/icons-react';
import { useBudgetStore } from '@/store/budgets';
import { BudgetStatus } from '@/types/budget';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface AlertData {
  id: string;
  type: 'exceeded' | 'warning';
  title: string;
  message: string;
  budgetStatus: BudgetStatus;
  priority: 'high' | 'medium';
}

const AlertCard = ({ 
  alert, 
  onDismiss, 
  onAdjustBudget, 
  onViewTransactions 
}: { 
  alert: AlertData; 
  onDismiss: (id: string) => void;
  onAdjustBudget: (budgetStatus: BudgetStatus) => void;
  onViewTransactions: (categoryId: string) => void;
}) => {
  const { budgetStatus } = alert;
  const isExceeded = alert.type === 'exceeded';
  const color = isExceeded ? 'red' : 'orange';
  const icon = isExceeded ? <IconAlertTriangle size={20} /> : <IconAlertCircle size={20} />;

  return (
    <Alert
      data-testid={`alert-${alert.type}`}
      data-color={color}
      color={color}
      variant="light"
      icon={<Box data-testid={`alert-icon-${alert.type}`}>{icon}</Box>}
      className={`modern-alert priority-${alert.priority} hover:shadow-md hover:scale-[1.01] animate-slide-in transition-all duration-300`}
      style={{
        borderRadius: '12px',
        border: `1px solid var(--mantine-color-${color}-3)`,
        backgroundImage: `linear-gradient(135deg, var(--mantine-color-${color}-0) 0%, var(--mantine-color-${color}-1) 100%)`,
        backgroundColor: 'transparent',
        transition: 'all 0.3s ease',
      }}
      withCloseButton={false}
    >
      <Group justify="space-between" align="flex-start">
        <Box flex={1}>
          <Group gap="sm" mb="xs">
            <Badge
              color={budgetStatus.budget.category.color}
              variant="light"
              size="sm"
            >
              {budgetStatus.budget.category.name}
            </Badge>
            <Badge
              color={color}
              variant="filled"
              size="sm"
            >
              {alert.title}
            </Badge>
          </Group>
          
          <Text size="sm" mb="md">
            {alert.message}
          </Text>

          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Budget: {formatCurrency(budgetStatus.budget.amount)}
            </Text>
            <Text size="xs" c="dimmed">•</Text>
            <Text size="xs" c="dimmed">
              Spent: {formatCurrency(budgetStatus.spent)}
            </Text>
            <Text size="xs" c="dimmed">•</Text>
            <Text size="xs" c={isExceeded ? 'red' : 'orange'}>
              {budgetStatus.percentage.toFixed(0)}% used
            </Text>
          </Group>

          {isExceeded && (
            <Group gap="xs" mt="md">
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconEdit size={14} />}
                onClick={() => onAdjustBudget(budgetStatus)}
                className="transition-all duration-200 hover:scale-105"
              >
                Adjust Budget
              </Button>
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                leftSection={<IconEye size={14} />}
                onClick={() => onViewTransactions(budgetStatus.budget.category.id)}
                className="transition-all duration-200 hover:scale-105"
              >
                View Transactions
              </Button>
            </Group>
          )}
        </Box>

        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          onClick={() => onDismiss(alert.id)}
          aria-label="Dismiss alert"
          className="transition-all duration-200 hover:scale-110"
        >
          <IconX size={16} />
        </ActionIcon>
      </Group>
    </Alert>
  );
};

const AlertSkeleton = () => (
  <Card
    p="md"
    radius="md"
    data-testid="alert-skeleton"
    style={{
      background: 'var(--mantine-color-gray-1)',
      border: '1px solid var(--mantine-color-gray-3)',
    }}
  >
    <Group justify="space-between" align="flex-start">
      <Box flex={1}>
        <Group gap="sm" mb="xs">
          <Skeleton height={20} width={80} />
          <Skeleton height={20} width={100} />
        </Group>
        <Skeleton height={16} width="90%" mb="md" />
        <Group gap="xs">
          <Skeleton height={12} width={80} />
          <Skeleton height={12} width={80} />
          <Skeleton height={12} width={60} />
        </Group>
      </Box>
      <Skeleton height={24} width={24} />
    </Group>
  </Card>
);

interface BudgetAlertsProps {
  onAdjustBudget?: (budgetStatus: BudgetStatus) => void;
  onViewTransactions?: (categoryId: string) => void;
}

export const BudgetAlerts = ({ 
  onAdjustBudget, 
  onViewTransactions 
}: BudgetAlertsProps = {}) => {
  const {
    budgetOverview,
    isLoading,
    error,
    fetchBudgetOverview,
    currentMonth,
  } = useBudgetStore();

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchBudgetOverview(currentMonth);
    
    // Auto-refresh alerts every minute
    const interval = setInterval(() => {
      fetchBudgetOverview(currentMonth);
    }, 60000);

    return () => clearInterval(interval);
  }, [currentMonth]); // Only depend on currentMonth

  const generateAlerts = (): AlertData[] => {
    // Safety check: ensure budgetOverview exists and has budgets array
    if (!budgetOverview?.budgets || !Array.isArray(budgetOverview.budgets)) {
      console.log('BudgetAlerts: No budget data available', { budgetOverview });
      return [];
    }

    console.log('BudgetAlerts: Processing budgets for alerts', budgetOverview.budgets);
    const alerts: AlertData[] = [];

    budgetOverview.budgets.forEach((status) => {
      const alertId = `${status.budget.id}-${status.budget.month}`;
      
      if (dismissedAlerts.has(alertId)) return;

      if (status.is_exceeded) {
        alerts.push({
          id: alertId,
          type: 'exceeded',
          title: 'Budget Exceeded',
          message: `You have exceeded your ${status.budget.category.name} budget by ${formatCurrency(Math.abs(status.remaining))}`,
          budgetStatus: status,
          priority: 'high',
        });
      } else if (status.percentage >= 90) {
        alerts.push({
          id: alertId,
          type: 'warning',
          title: 'Budget Warning',
          message: `You have used ${status.percentage.toFixed(0)}% of your ${status.budget.category.name} budget`,
          budgetStatus: status,
          priority: 'medium',
        });
      }
    });

    return alerts.sort((a, b) => {
      // Sort by priority (high first) then by percentage
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return b.budgetStatus.percentage - a.budgetStatus.percentage;
    });
  };

  const alerts = generateAlerts();
  const criticalAlerts = alerts.filter(alert => alert.type === 'exceeded');
  const warningAlerts = alerts.filter(alert => alert.type === 'warning');

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  const handleAdjustBudget = (budgetStatus: BudgetStatus) => {
    if (onAdjustBudget) {
      onAdjustBudget(budgetStatus);
    } else {
      console.log('Adjust budget for:', budgetStatus.budget.category.name);
    }
  };

  const handleViewTransactions = (categoryId: string) => {
    if (onViewTransactions) {
      onViewTransactions(categoryId);
    } else {
      console.log('View transactions for category:', categoryId);
    }
  };

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Error"
        color="red"
        variant="light"
      >
        Failed to load budget alerts
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={3}>
          Budget Alerts {alerts.length > 0 && `(${alerts.length})`}
        </Title>
        {alerts.length === 0 && !isLoading && (
          <Badge color="green" variant="light" size="lg">
            All Good!
          </Badge>
        )}
      </Group>

      {isLoading ? (
        <Stack gap="md">
          {[1, 2, 3].map((i) => (
            <AlertSkeleton key={i} />
          ))}
        </Stack>
      ) : alerts.length > 0 ? (
        <Stack gap="lg">
          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <Box data-testid="alerts-critical">
              <Text size="sm" c="red" fw={500} mb="md">
                Critical ({criticalAlerts.length})
              </Text>
              <Stack gap="md">
                {criticalAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                    onAdjustBudget={handleAdjustBudget}
                    onViewTransactions={handleViewTransactions}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Warning Alerts */}
          {warningAlerts.length > 0 && (
            <>
              {criticalAlerts.length > 0 && <Divider />}
              <Box data-testid="alerts-warning">
                <Text size="sm" c="orange" fw={500} mb="md">
                  Warnings ({warningAlerts.length})
                </Text>
                <Stack gap="md">
                  {warningAlerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onDismiss={handleDismissAlert}
                      onAdjustBudget={handleAdjustBudget}
                      onViewTransactions={handleViewTransactions}
                    />
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      ) : (
        <Card p="xl" radius="md">
          <Center>
            <Stack align="center" gap="md">
              <IconCheck size={48} color="var(--mantine-color-green-6)" />
              <Text c="green" fw={500} size="lg">
                All budgets are on track!
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                Great job managing your finances
              </Text>
            </Stack>
          </Center>
        </Card>
      )}
    </Stack>
  );
};