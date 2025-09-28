'use client';

import { useEffect } from 'react';
import {
  Card,
  Grid,
  Stack,
  Title,
  Text,
  RingProgress,
  Group,
  Select,
  Skeleton,
  Alert,
  Box,
  Badge,
  Center,
} from '@mantine/core';
import { IconAlertCircle, IconTrendingUp, IconTrendingDown, IconWallet } from '@tabler/icons-react';
import { useBudgetStore } from '@/store/budgets';
import { BudgetStatus } from '@/types/budget';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatMonth = (monthString: string) => {
  const [year, month] = monthString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const generateMonthOptions = () => {
  const options = [];
  const currentDate = new Date();
  
  for (let i = -6; i <= 6; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  
  return options;
};

const BudgetCard = ({ budgetStatus }: { budgetStatus: BudgetStatus }) => {
  const { budget, spent, remaining, percentage, is_exceeded } = budgetStatus;
  const progressColor = is_exceeded ? 'red' : percentage > 80 ? 'orange' : 'blue';
  
  return (
    <Card
      data-testid="budget-card"
      data-exceeded={is_exceeded}
      p="lg"
      radius="md"
      style={{
        backgroundImage: `linear-gradient(135deg, ${budget.category.color}15 0%, ${budget.category.color}05 100%)`,
        backgroundColor: 'transparent',
        border: `1px solid ${budget.category.color}30`,
        transition: 'all 0.3s ease',
        cursor: 'pointer',
      }}
      className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="sm" c="dimmed" mb={4}>
              {budget.category.name}
            </Text>
            <Text size="lg" fw={600}>
              {formatCurrency(spent)} / {formatCurrency(budget.amount)}
            </Text>
          </Box>
          {is_exceeded && (
            <Badge color="red" variant="light" size="sm">
              Over Budget
            </Badge>
          )}
        </Group>

        <Center>
          <RingProgress
            size={120}
            thickness={8}
            sections={[
              {
                value: Math.min(percentage, 100),
                color: progressColor,
              },
            ]}
            label={
              <Center>
                <Stack gap={0} align="center">
                  <Text size="xs" c="dimmed">
                    {percentage.toFixed(0)}%
                  </Text>
                  <Text size="xs" c={is_exceeded ? 'red' : 'dimmed'}>
                    {is_exceeded ? 'Over' : 'Used'}
                  </Text>
                </Stack>
              </Center>
            }
            className="animate-progress"
            style={{
              transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Center>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Remaining
          </Text>
          <Text
            size="sm"
            fw={500}
            c={remaining < 0 ? 'red' : 'green'}
          >
            {formatCurrency(remaining)}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};

const OverviewCard = ({ 
  title, 
  amount, 
  icon, 
  color, 
  trend 
}: { 
  title: string; 
  amount: number; 
  icon: React.ReactNode; 
  color: string;
  trend?: 'up' | 'down';
}) => (
  <Card
    p="lg"
    radius="md"
    style={{
      backgroundImage: `linear-gradient(135deg, var(--mantine-color-${color}-1) 0%, var(--mantine-color-${color}-0) 100%)`,
      backgroundColor: 'transparent',
      border: `1px solid var(--mantine-color-${color}-3)`,
      transition: 'all 0.3s ease',
    }}
    className="hover:shadow-md hover:scale-[1.01] transition-all duration-300"
  >
    <Group justify="space-between" align="flex-start">
      <Stack gap="xs">
        <Group gap="xs">
          <Box c={color}>{icon}</Box>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
        </Group>
        <Title order={2} c={color}>
          {formatCurrency(amount)}
        </Title>
      </Stack>
      {trend && (
        <Box c={trend === 'up' ? 'red' : 'green'}>
          {trend === 'up' ? <IconTrendingUp size={20} /> : <IconTrendingDown size={20} />}
        </Box>
      )}
    </Group>
  </Card>
);

const BudgetSkeleton = () => (
  <Card p="lg" radius="md" data-testid="budget-skeleton">
    <Stack gap="md">
      <Group justify="space-between">
        <Skeleton height={20} width="40%" />
        <Skeleton height={16} width="30%" />
      </Group>
      <Center>
        <Skeleton height={120} width={120} circle />
      </Center>
      <Group justify="space-between">
        <Skeleton height={14} width="30%" />
        <Skeleton height={14} width="25%" />
      </Group>
    </Stack>
  </Card>
);

export const BudgetOverview = () => {
  const {
    budgetOverview,
    currentMonth,
    isLoading,
    error,
    fetchBudgetOverview,
    setCurrentMonth,
  } = useBudgetStore();

  const monthOptions = generateMonthOptions();

  useEffect(() => {
    fetchBudgetOverview(currentMonth);
  }, [currentMonth]); // Only depend on currentMonth

  const handleMonthChange = (value: string | null) => {
    if (value) {
      setCurrentMonth(value);
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
        {error}
      </Alert>
    );
  }

  return (
    <Stack gap="lg">
      {/* Month Selector */}
      <Group justify="space-between" align="center">
        <Title order={2}>Budget Overview</Title>
        <Select
          value={currentMonth}
          onChange={handleMonthChange}
          data={monthOptions}
          placeholder="Select month"
          style={{ minWidth: 200 }}
        />
      </Group>

      {/* Overview Cards */}
      <Grid>
        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Card p="lg" radius="md" data-testid="budget-skeleton">
              <Stack gap="xs">
                <Skeleton height={20} width="60%" />
                <Skeleton height={32} width="80%" />
              </Stack>
            </Card>
          ) : (
            <OverviewCard
              title="Total Budget"
              amount={budgetOverview?.total_budget || 0}
              icon={<IconWallet size={20} />}
              color="blue"
            />
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Card p="lg" radius="md" data-testid="budget-skeleton">
              <Stack gap="xs">
                <Skeleton height={20} width="60%" />
                <Skeleton height={32} width="80%" />
              </Stack>
            </Card>
          ) : (
            <OverviewCard
              title="Total Spent"
              amount={budgetOverview?.total_spent || 0}
              icon={<IconTrendingUp size={20} />}
              color="orange"
              trend="up"
            />
          )}
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>
          {isLoading ? (
            <Card p="lg" radius="md" data-testid="budget-skeleton">
              <Stack gap="xs">
                <Skeleton height={20} width="60%" />
                <Skeleton height={32} width="80%" />
              </Stack>
            </Card>
          ) : (
            <OverviewCard
              title="Remaining"
              amount={budgetOverview?.total_remaining || 0}
              icon={<IconTrendingDown size={20} />}
              color={budgetOverview && budgetOverview.total_remaining < 0 ? 'red' : 'green'}
              trend="down"
            />
          )}
        </Grid.Col>
      </Grid>

      {/* Budget Categories */}
      <Box>
        <Title order={3} mb="md">
          Budget Categories
        </Title>
        <Grid>
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Grid.Col key={i} span={{ base: 12, sm: 6, lg: 4 }}>
                  <BudgetSkeleton />
                </Grid.Col>
              ))}
            </>
          ) : budgetOverview?.budgets.length ? (
            budgetOverview.budgets.map((budgetStatus) => (
              <Grid.Col key={budgetStatus.budget.id} span={{ base: 12, sm: 6, lg: 4 }}>
                <BudgetCard budgetStatus={budgetStatus} />
              </Grid.Col>
            ))
          ) : (
            <Grid.Col span={12}>
              <Card p="xl" radius="md">
                <Center>
                  <Stack align="center" gap="md">
                    <IconWallet size={48} color="var(--mantine-color-gray-5)" />
                    <Text c="dimmed" ta="center">
                      No budgets set for {formatMonth(currentMonth)}
                    </Text>
                    <Text size="sm" c="dimmed" ta="center">
                      Create your first budget to start tracking your spending
                    </Text>
                  </Stack>
                </Center>
              </Card>
            </Grid.Col>
          )}
        </Grid>
      </Box>
    </Stack>
  );
};