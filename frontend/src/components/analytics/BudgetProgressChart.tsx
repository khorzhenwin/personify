'use client';

import { useMemo } from 'react';
import { 
  Card, 
  Title, 
  Text, 
  Stack, 
  Group, 
  Box, 
  Skeleton,
  Progress,
  Badge,
  RingProgress,
  SimpleGrid
} from '@mantine/core';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { BudgetPerformance } from '@/lib/api/analytics';
import { IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react';

interface BudgetProgressChartProps {
  data: BudgetPerformance[];
  isLoading?: boolean;
  showRings?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Card p="sm" shadow="md" radius="md" style={{ border: 'none' }}>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {label}
          </Text>
          <Group gap="md">
            <Box>
              <Text size="xs" c="dimmed">Budgeted</Text>
              <Text size="sm" fw={600} c="blue">
                ${data.budgeted.toLocaleString()}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Spent</Text>
              <Text size="sm" fw={600} c={data.status === 'over' ? 'red' : 'green'}>
                ${data.spent.toLocaleString()}
              </Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">Remaining</Text>
              <Text size="sm" fw={600} c={data.remaining >= 0 ? 'green' : 'red'}>
                ${data.remaining.toLocaleString()}
              </Text>
            </Box>
          </Group>
          <Badge 
            variant="light" 
            color={data.status === 'over' ? 'red' : data.status === 'on-track' ? 'yellow' : 'green'}
            size="sm"
          >
            {data.percentage}% used
          </Badge>
        </Stack>
      </Card>
    );
  }
  return null;
};

const BudgetRingCard = ({ item }: { item: BudgetPerformance }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over': return 'red';
      case 'on-track': return 'yellow';
      default: return 'green';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'over': return <IconTrendingUp size={16} />;
      case 'on-track': return <IconMinus size={16} />;
      default: return <IconTrendingDown size={16} />;
    }
  };

  return (
    <Card p="md" radius="md" className="modern-card micro-interaction">
      <Stack gap="md" align="center">
        <RingProgress
          size={80}
          thickness={8}
          sections={[
            { 
              value: Math.min(item.percentage, 100), 
              color: getStatusColor(item.status),
              tooltip: `${item.percentage}% used`
            }
          ]}
          label={
            <Text size="xs" ta="center" fw={600}>
              {item.percentage}%
            </Text>
          }
        />
        
        <Box ta="center">
          <Text size="sm" fw={500} mb={4}>
            {item.category}
          </Text>
          <Group gap="xs" justify="center" align="center">
            <Box c={getStatusColor(item.status)}>
              {getStatusIcon(item.status)}
            </Box>
            <Badge 
              variant="light" 
              color={getStatusColor(item.status)}
              size="xs"
            >
              {item.status.replace('-', ' ')}
            </Badge>
          </Group>
        </Box>

        <Stack gap={4} w="100%">
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Spent</Text>
            <Text size="xs" fw={500}>${item.spent.toLocaleString()}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Budget</Text>
            <Text size="xs" fw={500}>${item.budgeted.toLocaleString()}</Text>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Remaining</Text>
            <Text 
              size="xs" 
              fw={500} 
              c={item.remaining >= 0 ? 'green' : 'red'}
            >
              ${item.remaining.toLocaleString()}
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
};

export const BudgetProgressChart = ({ 
  data, 
  isLoading = false, 
  showRings = false 
}: BudgetProgressChartProps) => {
  // Add data validation
  const safeData = Array.isArray(data) ? data : [];
  
  const chartData = useMemo(() => {
    return safeData.map(item => ({
      ...item,
      name: item?.category || 'Unknown',
    }));
  }, [safeData]);

  const summary = useMemo(() => {
    const totalBudgeted = safeData.reduce((sum, item) => sum + (item?.budgeted || 0), 0);
    const totalSpent = safeData.reduce((sum, item) => sum + (item?.spent || 0), 0);
    const totalRemaining = safeData.reduce((sum, item) => sum + (item?.remaining || 0), 0);
    const overBudgetCount = safeData.filter(item => item?.status === 'over').length;
    
    return { totalBudgeted, totalSpent, totalRemaining, overBudgetCount };
  }, [safeData]);

  if (isLoading) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md">
          <Skeleton height={24} width="60%" />
          <Group gap="md">
            {[1, 2, 3].map(i => (
              <Box key={i} style={{ flex: 1 }}>
                <Skeleton height={16} width="60%" mb="xs" />
                <Skeleton height={24} width="80%" />
              </Box>
            ))}
          </Group>
          {showRings ? (
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} height={200} />
              ))}
            </SimpleGrid>
          ) : (
            <Skeleton height={300} />
          )}
        </Stack>
      </Card>
    );
  }

  if (!safeData.length) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md" align="center" py="xl">
          <Text size="lg" c="dimmed">
            No budget data available
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Set up budgets to track your spending progress
          </Text>
        </Stack>
      </Card>
    );
  }

  if (showRings) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Title order={3} mb="xs">
                Budget Progress
              </Title>
              <Text c="dimmed" size="sm">
                Track your spending against budget limits
              </Text>
            </Box>
            {summary.overBudgetCount > 0 && (
              <Badge variant="light" color="red" size="lg">
                {summary.overBudgetCount} over budget
              </Badge>
            )}
          </Group>

          {/* Summary */}
          <Group gap="md">
            <Box style={{ flex: 1 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                Total Budgeted
              </Text>
              <Text size="lg" fw={700} c="blue">
                ${summary.totalBudgeted.toLocaleString()}
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                Total Spent
              </Text>
              <Text size="lg" fw={700} c="orange">
                ${summary.totalSpent.toLocaleString()}
              </Text>
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
                Remaining
              </Text>
              <Text 
                size="lg" 
                fw={700} 
                c={summary.totalRemaining >= 0 ? 'green' : 'red'}
              >
                ${summary.totalRemaining.toLocaleString()}
              </Text>
            </Box>
          </Group>

          <SimpleGrid cols={{ base: 2, sm: 3, lg: 4 }} spacing="md">
            {safeData.map((item, index) => (
              <BudgetRingCard key={index} item={item} />
            ))}
          </SimpleGrid>
        </Stack>
      </Card>
    );
  }

  return (
    <Card p="lg" radius="md" className="modern-card">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={3} mb="xs">
              Budget vs Actual Spending
            </Title>
            <Text c="dimmed" size="sm">
              Compare budgeted amounts with actual spending
            </Text>
          </Box>
          {summary.overBudgetCount > 0 && (
            <Badge variant="light" color="red" size="lg">
              {summary.overBudgetCount} over budget
            </Badge>
          )}
        </Group>

        <Box style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
              <XAxis 
                dataKey="name" 
                stroke="var(--mantine-color-gray-6)"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                stroke="var(--mantine-color-gray-6)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="budgeted" 
                fill="#228be6" 
                name="Budgeted"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
              <Bar 
                dataKey="spent" 
                name="Spent"
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.status === 'over' ? '#ff6b6b' : '#51cf66'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* Category Progress Bars */}
        <Stack gap="md">
          {safeData.map((item, index) => (
            <Box key={index}>
              <Group justify="space-between" mb="xs">
                <Text size="sm" fw={500}>
                  {item.category}
                </Text>
                <Group gap="xs">
                  <Badge 
                    variant="light" 
                    color={item.status === 'over' ? 'red' : item.status === 'on-track' ? 'yellow' : 'green'}
                    size="sm"
                  >
                    {item.percentage}%
                  </Badge>
                  <Text size="sm" c="dimmed">
                    ${item.spent.toLocaleString()} / ${item.budgeted.toLocaleString()}
                  </Text>
                </Group>
              </Group>
              <Progress 
                value={Math.min(item.percentage, 100)} 
                color={item.status === 'over' ? 'red' : item.status === 'on-track' ? 'yellow' : 'green'}
                size="md"
                radius="md"
                animated={item.status === 'over'}
              />
            </Box>
          ))}
        </Stack>
      </Stack>
    </Card>
  );
};