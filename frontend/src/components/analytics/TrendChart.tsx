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
  Badge,
  SegmentedControl
} from '@mantine/core';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { SpendingTrend } from '@/lib/api/analytics';
import { useState } from 'react';

interface TrendChartProps {
  data: SpendingTrend[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Card p="sm" shadow="md" radius="md" style={{ border: 'none' }}>
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            {new Date(label).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            })}
          </Text>
          {payload.map((entry: any, index: number) => (
            <Group key={index} gap="xs" align="center">
              <Box
                w={8}
                h={8}
                style={{
                  backgroundColor: entry.color,
                  borderRadius: '50%',
                }}
              />
              <Text size="sm" tt="capitalize">
                {entry.dataKey}:
              </Text>
              <Text size="sm" fw={600} c={entry.color}>
                ${entry.value.toLocaleString()}
              </Text>
            </Group>
          ))}
        </Stack>
      </Card>
    );
  }
  return null;
};

export const TrendChart = ({ data, isLoading = false }: TrendChartProps) => {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  const chartData = useMemo(() => {
    // Group data by date and separate income/expense
    const groupedData = data.reduce((acc, item) => {
      const date = item.date;
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      acc[date][item.type] += item.amount;
      return acc;
    }, {} as Record<string, { date: string; income: number; expense: number }>);

    return Object.values(groupedData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);

  const summary = useMemo(() => {
    const totalIncome = chartData.reduce((sum, item) => sum + item.income, 0);
    const totalExpense = chartData.reduce((sum, item) => sum + item.expense, 0);
    const netAmount = totalIncome - totalExpense;
    
    return { totalIncome, totalExpense, netAmount };
  }, [chartData]);

  if (isLoading) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md">
          <Group justify="space-between">
            <Skeleton height={24} width="40%" />
            <Skeleton height={32} width={120} />
          </Group>
          <Group gap="md">
            {[1, 2, 3].map(i => (
              <Box key={i} style={{ flex: 1 }}>
                <Skeleton height={16} width="60%" mb="xs" />
                <Skeleton height={24} width="80%" />
              </Box>
            ))}
          </Group>
          <Skeleton height={300} />
        </Stack>
      </Card>
    );
  }

  if (!chartData.length) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md" align="center" py="xl">
          <Text size="lg" c="dimmed">
            No trend data available
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Add more transactions to see spending trends over time
          </Text>
        </Stack>
      </Card>
    );
  }

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <Card p="lg" radius="md" className="modern-card">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={3} mb="xs">
              Spending Trends
            </Title>
            <Text c="dimmed" size="sm">
              Income and expense patterns over time
            </Text>
          </Box>
          <SegmentedControl
            value={chartType}
            onChange={(value) => setChartType(value as 'line' | 'area')}
            data={[
              { label: 'Area', value: 'area' },
              { label: 'Line', value: 'line' },
            ]}
            size="sm"
          />
        </Group>

        {/* Summary Cards */}
        <Group gap="md">
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Total Income
            </Text>
            <Group gap="xs" align="center">
              <Text size="lg" fw={700} c="green">
                ${summary.totalIncome.toLocaleString()}
              </Text>
            </Group>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Total Expenses
            </Text>
            <Group gap="xs" align="center">
              <Text size="lg" fw={700} c="red">
                ${summary.totalExpense.toLocaleString()}
              </Text>
            </Group>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Net Amount
            </Text>
            <Group gap="xs" align="center">
              <Text 
                size="lg" 
                fw={700} 
                c={summary.netAmount >= 0 ? 'green' : 'red'}
              >
                ${summary.netAmount.toLocaleString()}
              </Text>
              <Badge 
                variant="light" 
                color={summary.netAmount >= 0 ? 'green' : 'red'}
                size="sm"
              >
                {summary.netAmount >= 0 ? 'Surplus' : 'Deficit'}
              </Badge>
            </Group>
          </Box>
        </Group>

        <Box style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-gray-3)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
                stroke="var(--mantine-color-gray-6)"
                fontSize={12}
              />
              <YAxis 
                tickFormatter={(value) => `$${value}`}
                stroke="var(--mantine-color-gray-6)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {chartType === 'area' ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="income"
                    stackId="1"
                    stroke="#51cf66"
                    fill="url(#incomeGradient)"
                    strokeWidth={2}
                    animationDuration={800}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stackId="2"
                    stroke="#ff6b6b"
                    fill="url(#expenseGradient)"
                    strokeWidth={2}
                    animationDuration={800}
                  />
                </>
              ) : (
                <>
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#51cf66"
                    strokeWidth={3}
                    dot={{ fill: '#51cf66', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#51cf66', strokeWidth: 2 }}
                    animationDuration={800}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#ff6b6b"
                    strokeWidth={3}
                    dot={{ fill: '#ff6b6b', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#ff6b6b', strokeWidth: 2 }}
                    animationDuration={800}
                  />
                </>
              )}
              
              {/* Gradients for area chart */}
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#51cf66" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#51cf66" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b6b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff6b6b" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
            </ChartComponent>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Card>
  );
};