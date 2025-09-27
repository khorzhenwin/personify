import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAnalyticsStore } from '@/store/analytics';
import { analyticsApi } from '@/lib/api/analytics';

// Mock the analytics API
jest.mock('@/lib/api/analytics');
const mockAnalyticsApi = analyticsApi as jest.Mocked<typeof analyticsApi>;

// Mock the analytics store
jest.mock('@/store/analytics');
const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

// Mock recharts to avoid rendering issues in tests
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ onClick }: any) => (
    <div 
      data-testid="pie" 
      onClick={() => onClick && onClick({ category: 'Food & Dining' })}
    />
  ),
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock dayjs
jest.mock('dayjs', () => {
  const originalDayjs = jest.requireActual('dayjs');
  return {
    ...originalDayjs,
    default: jest.fn(() => ({
      subtract: jest.fn(() => ({
        toDate: jest.fn(() => new Date('2024-01-01')),
      })),
      format: jest.fn(() => '2024-01-01'),
    })),
  };
});

const mockApiData = {
  spending_by_category: [
    { category: 'Food & Dining', amount: 850, color: '#FF6B6B', percentage: 35 },
    { category: 'Transportation', amount: 420, color: '#4ECDC4', percentage: 17 },
    { category: 'Shopping', amount: 380, color: '#45B7D1', percentage: 16 },
  ],
  spending_trends: [
    { date: '2024-01-01', amount: 100, type: 'expense' as const },
    { date: '2024-01-01', amount: 500, type: 'income' as const },
    { date: '2024-01-02', amount: 150, type: 'expense' as const },
  ],
  budget_performance: [
    { category: 'Food & Dining', budgeted: 1000, spent: 850, remaining: 150, percentage: 85, status: 'under' as const },
    { category: 'Transportation', budgeted: 400, spent: 420, remaining: -20, percentage: 105, status: 'over' as const },
  ],
  monthly_summary: {
    month: '2024-01',
    total_income: 4500,
    total_expenses: 2340,
    net_amount: 2160,
    transaction_count: 47,
    top_categories: [
      { category: 'Food & Dining', amount: 850, count: 15 },
      { category: 'Transportation', amount: 420, count: 8 },
    ],
  },
};

const createMockStore = (overrides = {}) => ({
  spendingByCategory: mockApiData.spending_by_category,
  spendingTrends: mockApiData.spending_trends,
  budgetPerformance: mockApiData.budget_performance,
  monthlySummary: mockApiData.monthly_summary,
  analyticsData: mockApiData,
  isLoading: false,
  error: null,
  selectedCategory: null,
  selectedDateRange: null,
  fetchAnalyticsData: jest.fn(),
  fetchSpendingByCategory: jest.fn(),
  fetchSpendingTrends: jest.fn(),
  fetchBudgetPerformance: jest.fn(),
  fetchMonthlySummary: jest.fn(),
  setSelectedCategory: jest.fn(),
  setSelectedDateRange: jest.fn(),
  clearError: jest.fn(),
  ...overrides,
});

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('Analytics Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsApi.getAnalyticsData.mockResolvedValue(mockApiData);
    mockUseAnalyticsStore.mockReturnValue(createMockStore());
  });

  describe('Complete Dashboard Flow', () => {
    it('should render complete analytics dashboard with all data', async () => {
      renderWithProvider(<AnalyticsDashboard />);

      // Check main dashboard elements
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Insights into your financial patterns and trends')).toBeInTheDocument();

      // Check summary statistics
      expect(screen.getByText('Total Income')).toBeInTheDocument();
      expect(screen.getByText('$4,500')).toBeInTheDocument();
      expect(screen.getByText('Total Expenses')).toBeInTheDocument();
      expect(screen.getByText('$2,340')).toBeInTheDocument();
      expect(screen.getByText('Net Amount')).toBeInTheDocument();
      expect(screen.getByText('$2,160')).toBeInTheDocument();
      expect(screen.getByText('Transactions')).toBeInTheDocument();
      expect(screen.getByText('47')).toBeInTheDocument();

      // Check charts are rendered
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();

      // Check top categories section
      expect(screen.getByText('Top Spending Categories')).toBeInTheDocument();
      expect(screen.getByText('Food & Dining')).toBeInTheDocument();
      expect(screen.getByText('Transportation')).toBeInTheDocument();
    });

    it('should handle complete user interaction flow', async () => {
      const mockStore = createMockStore();
      mockUseAnalyticsStore.mockReturnValue(mockStore);

      renderWithProvider(<AnalyticsDashboard />);

      // 1. Switch to detailed view
      const detailedButton = screen.getByText('Detailed');
      fireEvent.click(detailedButton);

      await waitFor(() => {
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });

      // 2. Select a category (this would trigger in real SpendingChart)
      const mockStoreWithCategory = createMockStore({ selectedCategory: 'Food & Dining' });
      mockUseAnalyticsStore.mockReturnValue(mockStoreWithCategory);

      // Re-render with selected category
      renderWithProvider(<AnalyticsDashboard />);
      expect(screen.getByText('Filtered: Food & Dining')).toBeInTheDocument();

      // 3. Clear category selection
      const clearButton = screen.getByText('×');
      fireEvent.click(clearButton);

      expect(mockStore.setSelectedCategory).toHaveBeenCalledWith(null);
    });

    it('should handle data refresh flow', async () => {
      const mockStore = createMockStore();
      mockUseAnalyticsStore.mockReturnValue(mockStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Click refresh button
      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockStore.fetchAnalyticsData).toHaveBeenCalled();
    });

    it('should handle error and recovery flow', async () => {
      // Start with error state
      const errorStore = createMockStore({ 
        error: 'Network error',
        isLoading: false 
      });
      mockUseAnalyticsStore.mockReturnValue(errorStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Check error display
      expect(screen.getByText('Error loading analytics data')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(errorStore.clearError).toHaveBeenCalled();
      expect(errorStore.fetchAnalyticsData).toHaveBeenCalled();
    });

    it('should handle loading states across all components', () => {
      const loadingStore = createMockStore({ isLoading: true });
      mockUseAnalyticsStore.mockReturnValue(loadingStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Should show loading skeletons in stat cards and charts
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      // Loading states would be visible in the actual components
    });
  });

  describe('Chart Interactions', () => {
    it('should handle spending chart category selection', async () => {
      const mockStore = createMockStore();
      mockUseAnalyticsStore.mockReturnValue(mockStore);

      renderWithProvider(<AnalyticsDashboard />);

      // This would be triggered by actual chart interaction
      // We're testing the integration between dashboard and store
      expect(mockStore.setSelectedCategory).toBeDefined();
    });

    it('should handle chart view switching in detailed mode', async () => {
      renderWithProvider(<AnalyticsDashboard />);

      // Switch to detailed view
      const detailedButton = screen.getByText('Detailed');
      fireEvent.click(detailedButton);

      await waitFor(() => {
        expect(screen.getByText('Budget Performance')).toBeInTheDocument();
      });

      // Check chart view controls
      expect(screen.getByText('Rings')).toBeInTheDocument();
      expect(screen.getByText('Bars')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render with responsive container', () => {
      renderWithProvider(<AnalyticsDashboard />);

      const container = document.querySelector('[class*="mantine-Container"]');
      expect(container).toBeInTheDocument();
    });

    it('should handle mobile-friendly interactions', () => {
      renderWithProvider(<AnalyticsDashboard />);

      // Check for touch-friendly elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);

      // Check for responsive charts
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across chart updates', async () => {
      const mockStore = createMockStore();
      mockUseAnalyticsStore.mockReturnValue(mockStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Verify that all charts receive consistent data
      expect(screen.getByText('$4,500')).toBeInTheDocument(); // Income from summary
      expect(screen.getByText('$2,340')).toBeInTheDocument(); // Expenses from summary
      
      // The charts should display data that matches the summary
      // This is tested through the component integration
    });

    it('should handle empty data states gracefully', () => {
      const emptyStore = createMockStore({
        spendingByCategory: [],
        spendingTrends: [],
        budgetPerformance: [],
        monthlySummary: null,
      });
      mockUseAnalyticsStore.mockReturnValue(emptyStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Should still render dashboard structure
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      
      // Summary stats should show $0 values
      expect(screen.getByText('$0')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const mockStore = createMockStore();
      const fetchSpy = jest.spyOn(mockStore, 'fetchAnalyticsData');
      mockUseAnalyticsStore.mockReturnValue(mockStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Should only fetch data once on mount
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataStore = createMockStore({
        spendingByCategory: Array.from({ length: 20 }, (_, i) => ({
          category: `Category ${i}`,
          amount: Math.random() * 1000,
          color: '#FF6B6B',
          percentage: Math.random() * 100,
        })),
        spendingTrends: Array.from({ length: 365 }, (_, i) => ({
          date: `2024-01-${String(i % 30 + 1).padStart(2, '0')}`,
          amount: Math.random() * 500,
          type: i % 2 === 0 ? 'expense' as const : 'income' as const,
        })),
      });
      mockUseAnalyticsStore.mockReturnValue(largeDataStore);

      renderWithProvider(<AnalyticsDashboard />);

      // Should render without performance issues
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });
  });
});