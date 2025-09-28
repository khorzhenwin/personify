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
  Tooltip
} from '@mantine/core';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { SpendingByCategory } from '@/lib/api/analytics';

interface SpendingChartProps {
  data: SpendingByCategory[];
  isLoading?: boolean;
  onCategoryClick?: (category: string) => void;
  selectedCategory?: string | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Card p="sm" shadow="md" radius="md" style={{ border: 'none' }}>
        <Stack gap="xs">
          <Group gap="xs" align="center">
            <Box
              w={12}
              h={12}
              style={{
                backgroundColor: data.color,
                borderRadius: '50%',
              }}
            />
            <Text size="sm" fw={500}>
              {data.category}
            </Text>
          </Group>
          <Text size="lg" fw={700} c="blue">
            ${data.amount.toLocaleString()}
          </Text>
          <Text size="xs" c="dimmed">
            {data.percentage}% of total spending
          </Text>
        </Stack>
      </Card>
    );
  }
  return null;
};

const CustomLegend = ({ payload, onCategoryClick, selectedCategory }: any) => {
  return (
    <Stack gap="xs" mt="md">
      {payload?.map((entry: any, index: number) => {
        // Add null checks for entry and entry.payload
        if (!entry || !entry.payload || !entry.payload.category) {
          return null;
        }
        
        return (
          <Group
            key={index}
            gap="xs"
            align="center"
            style={{
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              backgroundColor: selectedCategory === entry.payload.category 
                ? 'var(--mantine-color-blue-0)' 
                : 'transparent',
              border: selectedCategory === entry.payload.category 
                ? '1px solid var(--mantine-color-blue-3)' 
                : '1px solid transparent',
              transition: 'all 0.2s ease',
            }}
            onClick={() => onCategoryClick?.(entry.payload.category)}
        >
          <Box
            w={12}
            h={12}
            style={{
              backgroundColor: entry.color,
              borderRadius: '50%',
            }}
          />
          <Text size="sm" style={{ flex: 1 }}>
            {entry.payload.category}
          </Text>
          <Badge variant="light" size="sm">
            ${entry.payload.amount?.toLocaleString() || '0'}
          </Badge>
          <Text size="xs" c="dimmed" w={40} ta="right">
            {entry.payload.percentage || 0}%
          </Text>
        </Group>
        );
      }).filter(Boolean)}
    </Stack>
  );
};

export const SpendingChart = ({ 
  data, 
  isLoading = false, 
  onCategoryClick,
  selectedCategory 
}: SpendingChartProps) => {
  // Add data validation
  const safeData = Array.isArray(data) ? data : [];
  
  const chartData = useMemo(() => {
    return safeData.map(item => ({
      ...item,
      name: item?.category || 'Unknown',
      value: item?.amount || 0,
    }));
  }, [safeData]);

  const totalSpending = useMemo(() => {
    return safeData.reduce((sum, item) => sum + (item?.amount || 0), 0);
  }, [safeData]);

  if (isLoading) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md">
          <Skeleton height={24} width="60%" />
          <Skeleton height={300} />
          <Stack gap="xs">
            {[1, 2, 3, 4].map(i => (
              <Group key={i} gap="xs">
                <Skeleton height={12} width={12} radius="50%" />
                <Skeleton height={16} style={{ flex: 1 }} />
                <Skeleton height={20} width={60} />
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>
    );
  }

  if (!safeData.length) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="md" align="center" py="xl">
          <Text size="lg" c="dimmed">
            No spending data available
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Start adding transactions to see your spending breakdown
          </Text>
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
              Spending by Category
            </Title>
            <Text c="dimmed" size="sm">
              Total spending: <Text span fw={600} c="blue">${totalSpending.toLocaleString()}</Text>
            </Text>
          </Box>
        </Group>

        <Box style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
                style={{ cursor: 'pointer' }}
                onClick={(data) => onCategoryClick?.(data.category)}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke={selectedCategory === entry.category ? '#228be6' : 'transparent'}
                    strokeWidth={selectedCategory === entry.category ? 3 : 0}
                    style={{
                      filter: selectedCategory === entry.category 
                        ? 'drop-shadow(0 4px 8px rgba(34, 139, 230, 0.3))' 
                        : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </Pie>
              <RechartsTooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>

        <CustomLegend 
          payload={chartData} 
          onCategoryClick={onCategoryClick}
          selectedCategory={selectedCategory}
        />
      </Stack>
    </Card>
  );
};