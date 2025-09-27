'use client';

import { useEffect, useState } from 'react';
import { 
  Container,
  Stack, 
  Group, 
  Box, 
  Title,
  Text,
  Card,
  SimpleGrid,
  Button,
  SegmentedControl,
  Select,
  Badge,
  Skeleton
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
  IconCalendar, 
  IconTrendingUp, 
  IconTrendingDown, 
  IconWallet,
  IconChartPie,
  IconChartLine,
  IconChartBar,
  IconRefresh
} from '@tabler/icons-react';
import { useAnalyticsStore } from '@/store/analytics';
import { SpendingChart } from './SpendingChart';
import { TrendChart } from './TrendChart';
import { BudgetProgressChart } from './BudgetProgressChart';
// Removed dayjs import - using native Date methods instead

interface AnalyticsDashboardProps {
  className?: string;
}

const StatCard = ({ 
  title, 
  value, 
  icon, 
  color, 
  trend,
  trendValue,
  isLoading = false
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  color: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  isLoading?: boolean;
}) => {
  if (isLoading) {
    return (
      <Card p="lg" radius="md" className="modern-card">
        <Stack gap="xs">
          <Group gap="xs">
            <Skeleton height={20} width={20} />
            <Skeleton height={16} width="60%" />
          </Group>
          <Skeleton height={28} width="80%" />
          {trendValue && <Skeleton height={14} width="40%" />}
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      p="lg"
      radius="md"
      className="modern-card micro-interaction"
      style={{
        background: `linear-gradient(135deg, var(--mantine-color-${color}-1) 0%, var(--mantine-color-${color}-0) 100%)`,
        border: `1px solid var(--mantine-color-${color}-3)`,
      }}
    >
      <Stack gap="xs">
        <Group gap="xs" align="center">
          <Box c={color}>{icon}</Box>
          <Text size="sm" c="dimmed">
            {title}
          </Text>
        </Group>
        <Title order={2} c={color}>
          {value}
        </Title>
        {trendValue && (
          <Group gap="xs" align="center">
            <Box c={trend === 'up' ? 'red' : 'green'}>
              {trend === 'up' ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
            </Box>
            <Text size="xs" c="dimmed">
              {trendValue} from last month
            </Text>
          </Group>
        )}
      </Stack>
    </Card>
  );
};

export const AnalyticsDashboard = ({ className }: AnalyticsDashboardProps) => {
  const {
    analyticsData,
    spendingByCategory,
    spendingTrends,
    budgetPerformance,
    monthlySummary,
    isLoading,
    error,
    selectedCategory,
    fetchAnalyticsData,
    setSelectedCategory,
    clearError
  } = useAnalyticsStore();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    new Date()
  ]);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed'>('overview');
  const [chartView, setChartView] = useState<'rings' | 'bars'>('rings');

  useEffect(() => {
    // Fetch initial data
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const handleDateRangeChange = (dates: [Date | null, Date | null]) => {
    setDateRange(dates);
    if (dates[0] && dates[1]) {
      fetchAnalyticsData({
        start: dates[0].toISOString().split('T')[0],
        end: dates[1].toISOString().split('T')[0]
      });
    }
  };

  const handleRefresh = () => {
    if (dateRange[0] && dateRange[1]) {
      fetchAnalyticsData({
        start: dateRange[0].toISOString().split('T')[0],
        end: dateRange[1].toISOString().split('T')[0]
      });
    } else {
      fetchAnalyticsData();
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(selectedCategory === category ? null : category);
  };

  if (error) {
    return (
      <Container size="xl" className={className}>
        <Card p="lg" radius="md" className="modern-card">
          <Stack gap="md" align="center">
            <Text size="lg" c="red">
              Error loading analytics data
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {error}
            </Text>
            <Button onClick={() => { clearError(); handleRefresh(); }}>
              Try Again
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="xl" className={className}>
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1} mb="xs">
              Analytics Dashboard
            </Title>
            <Text c="dimmed" size="lg">
              Insights into your financial patterns and trends
            </Text>
          </Box>
          
          <Group gap="md">
            <DatePickerInput
              type="range"
              placeholder="Select date range"
              value={dateRange}
              onChange={handleDateRangeChange}
              leftSection={<IconCalendar size={16} />}
              clearable
              maxDate={new Date()}
            />
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={handleRefresh}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        {/* Controls */}
        <Group justify="space-between" align="center">
          <SegmentedControl
            value={viewMode}
            onChange={(value) => setViewMode(value as 'overview' | 'detailed')}
            data={[
              { label: 'Overview', value: 'overview' },
              { label: 'Detailed', value: 'detailed' },
            ]}
          />
          
          {selectedCategory && (
            <Badge 
              variant="light" 
              size="lg"
              rightSection={
                <Box 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => setSelectedCategory(null)}
                >
                  ×
                </Box>
              }
            >
              Filtered: {selectedCategory}
            </Badge>
          )}
        </Group>

        {/* Summary Stats */}
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
          <StatCard
            title="Total Income"
            value={monthlySummary ? `$${monthlySummary.total_income.toLocaleString()}` : '$0'}
            icon={<IconTrendingUp size={20} />}
            color="green"
            trend="up"
            trendValue="+12%"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Expenses"
            value={monthlySummary ? `$${monthlySummary.total_expenses.toLocaleString()}` : '$0'}
            icon={<IconTrendingDown size={20} />}
            color="red"
            trend="down"
            trendValue="-5%"
            isLoading={isLoading}
          />
          <StatCard
            title="Net Amount"
            value={monthlySummary ? `$${monthlySummary.net_amount.toLocaleString()}` : '$0'}
            icon={<IconWallet size={20} />}
            color={monthlySummary && monthlySummary.net_amount >= 0 ? 'green' : 'red'}
            trend={monthlySummary && monthlySummary.net_amount >= 0 ? 'up' : 'down'}
            trendValue="+8%"
            isLoading={isLoading}
          />
          <StatCard
            title="Transactions"
            value={monthlySummary ? monthlySummary.transaction_count.toString() : '0'}
            icon={<IconChartPie size={20} />}
            color="blue"
            trend="up"
            trendValue="+3"
            isLoading={isLoading}
          />
        </SimpleGrid>

        {/* Charts Grid */}
        {viewMode === 'overview' ? (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
            <SpendingChart
              data={spendingByCategory}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
              selectedCategory={selectedCategory}
            />
            <BudgetProgressChart
              data={budgetPerformance}
              isLoading={isLoading}
              showRings={true}
            />
          </SimpleGrid>
        ) : (
          <Stack gap="xl">
            {/* Spending Chart */}
            <SpendingChart
              data={spendingByCategory}
              isLoading={isLoading}
              onCategoryClick={handleCategoryClick}
              selectedCategory={selectedCategory}
            />
            
            {/* Trend Chart */}
            <TrendChart
              data={spendingTrends}
              isLoading={isLoading}
            />
            
            {/* Budget Progress */}
            <Group justify="space-between" align="center">
              <Title order={3}>Budget Performance</Title>
              <SegmentedControl
                value={chartView}
                onChange={(value) => setChartView(value as 'rings' | 'bars')}
                data={[
                  { label: 'Rings', value: 'rings', icon: <IconChartPie size={16} /> },
                  { label: 'Bars', value: 'bars', icon: <IconChartBar size={16} /> },
                ]}
                size="sm"
              />
            </Group>
            <BudgetProgressChart
              data={budgetPerformance}
              isLoading={isLoading}
              showRings={chartView === 'rings'}
            />
          </Stack>
        )}

        {/* Top Categories Summary */}
        {monthlySummary?.top_categories && (
          <Card p="lg" radius="md" className="modern-card">
            <Stack gap="md">
              <Title order={3}>Top Spending Categories</Title>
              <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                {monthlySummary.top_categories.map((category, index) => (
                  <Card 
                    key={index} 
                    p="md" 
                    radius="md" 
                    className="modern-card micro-interaction"
                    style={{
                      background: 'linear-gradient(135deg, var(--mantine-color-gray-1) 0%, var(--mantine-color-gray-0) 100%)',
                      border: '1px solid var(--mantine-color-gray-3)',
                    }}
                  >
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500}>
                          {category.category}
                        </Text>
                        <Badge variant="light" size="sm">
                          #{index + 1}
                        </Badge>
                      </Group>
                      <Text size="lg" fw={700} c="blue">
                        ${category.amount.toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {category.count} transactions
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
};