'use client';

import { useEffect } from 'react';
import { 
  Title, 
  Text, 
  Card, 
  Grid, 
  Stack, 
  Group, 
  Button, 
  Box,
  Container,
  Divider,
  Tabs
} from '@mantine/core';
import { 
  IconWallet, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconPlus,
  IconArrowRight,
  IconChartPie,
  IconHome
} from '@tabler/icons-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { AppShellLayout } from '@/components/layout/AppShell';
import { BudgetAlerts } from '@/components/budgets';
import { AnalyticsDashboard } from '@/components/analytics';
import { useAuthStore } from '@/store/auth';
import { useBudgetStore } from '@/store/budgets';
import { useRouter } from 'next/navigation';

const DashboardCard = ({ 
  title, 
  amount, 
  icon, 
  color, 
  trend,
  onClick
}: { 
  title: string; 
  amount: string; 
  icon: React.ReactNode; 
  color: string;
  trend?: 'up' | 'down';
  onClick?: () => void;
}) => (
  <Card
    p="lg"
    radius="md"
    className="modern-card micro-interaction"
    style={{
      backgroundImage: `linear-gradient(135deg, var(--mantine-color-${color}-1) 0%, var(--mantine-color-${color}-0) 100%)`,
      backgroundColor: 'transparent',
      border: `1px solid var(--mantine-color-${color}-3)`,
      cursor: onClick ? 'pointer' : 'default',
    }}
    onClick={onClick}
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
          {amount}
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

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { fetchBudgetOverview, budgetOverview, currentMonth } = useBudgetStore();
  const router = useRouter();

  useEffect(() => {
    fetchBudgetOverview(currentMonth);
  }, [currentMonth]); // Only depend on currentMonth

  const handleNavigateToTransactions = () => {
    router.push('/transactions');
  };

  const handleNavigateToBudgets = () => {
    router.push('/budgets');
  };

  return (
    <AuthGuard>
      <AppShellLayout>
        <Container size="xl" py="md">
          <Tabs defaultValue="overview" variant="pills">
            <Tabs.List mb="xl">
              <Tabs.Tab value="overview" leftSection={<IconHome size={16} />}>
                Overview
              </Tabs.Tab>
              <Tabs.Tab value="analytics" leftSection={<IconChartPie size={16} />}>
                Analytics
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview">
              <Stack gap="xl">
                {/* Welcome Section */}
                <Box>
                  <Title order={1} mb="xs">
                    Welcome back, {user?.first_name}!
                  </Title>
                  <Text c="dimmed" size="lg">
                    Here&apos;s an overview of your financial activity
                  </Text>
                </Box>

                {/* Overview Cards */}
                <Grid>
                  <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <DashboardCard
                      title="Total Budget"
                      amount={budgetOverview ? `$${budgetOverview.total_budgeted.toLocaleString()}` : '$0.00'}
                      icon={<IconWallet size={20} />}
                      color="blue"
                      onClick={handleNavigateToBudgets}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <DashboardCard
                      title="Total Spent"
                      amount={budgetOverview ? `$${budgetOverview.total_spent.toLocaleString()}` : '$0.00'}
                      icon={<IconTrendingUp size={20} />}
                      color="orange"
                      trend="up"
                      onClick={handleNavigateToTransactions}
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <DashboardCard
                      title="Remaining"
                      amount={budgetOverview ? `$${budgetOverview.total_remaining.toLocaleString()}` : '$0.00'}
                      icon={<IconTrendingDown size={20} />}
                      color={budgetOverview && budgetOverview.total_remaining < 0 ? 'red' : 'green'}
                      trend="down"
                    />
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6, lg: 3 }}>
                    <DashboardCard
                      title="Active Budgets"
                      amount={budgetOverview ? budgetOverview.budgets.length.toString() : '0'}
                      icon={<IconWallet size={20} />}
                      color="purple"
                      onClick={handleNavigateToBudgets}
                    />
                  </Grid.Col>
                </Grid>

                {/* Budget Alerts Section */}
                <Card p="lg" radius="md" className="modern-card">
                  <BudgetAlerts />
                </Card>

                <Divider />

                {/* Quick Actions */}
                <Box>
                  <Title order={3} mb="md">
                    Quick Actions
                  </Title>
                  <Grid>
                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Card
                        p="lg"
                        radius="md"
                        className="modern-card micro-interaction"
                        style={{
                          backgroundImage: 'linear-gradient(135deg, var(--mantine-color-blue-1) 0%, var(--mantine-color-blue-0) 100%)',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--mantine-color-blue-3)',
                          cursor: 'pointer',
                        }}
                        onClick={handleNavigateToTransactions}
                      >
                        <Group justify="space-between" align="center">
                          <Box>
                            <Title order={4} mb="xs">
                              Add Transaction
                            </Title>
                            <Text size="sm" c="dimmed">
                              Record your income and expenses
                            </Text>
                          </Box>
                          <Button
                            variant="light"
                            leftSection={<IconPlus size={16} />}
                            rightSection={<IconArrowRight size={16} />}
                          >
                            Add
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, sm: 6 }}>
                      <Card
                        p="lg"
                        radius="md"
                        className="modern-card micro-interaction"
                        style={{
                          backgroundImage: 'linear-gradient(135deg, var(--mantine-color-green-1) 0%, var(--mantine-color-green-0) 100%)',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--mantine-color-green-3)',
                          cursor: 'pointer',
                        }}
                        onClick={handleNavigateToBudgets}
                      >
                        <Group justify="space-between" align="center">
                          <Box>
                            <Title order={4} mb="xs">
                              Manage Budgets
                            </Title>
                            <Text size="sm" c="dimmed">
                              Set and track your spending limits
                            </Text>
                          </Box>
                          <Button
                            variant="light"
                            color="green"
                            leftSection={<IconWallet size={16} />}
                            rightSection={<IconArrowRight size={16} />}
                          >
                            Manage
                          </Button>
                        </Group>
                      </Card>
                    </Grid.Col>
                  </Grid>
                </Box>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="analytics">
              <AnalyticsDashboard />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShellLayout>
    </AuthGuard>
  );
}