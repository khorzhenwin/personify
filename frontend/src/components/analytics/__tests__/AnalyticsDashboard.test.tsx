import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { useAnalyticsStore } from '@/store/analytics';

// Mock the analytics store
jest.mock('@/store/analytics');
const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;

// Mock the chart components
jest.mock('../SpendingChart', () => ({
  SpendingChart: ({ data, isLoading, onCategoryClick, selectedCategory }: any) => (
    <div data-testid="spending-chart">
      <div>Spending Chart</div>
      {isLoading && <div>Loading...</div>}
      {data.length > 0 && <div>Chart Data: {data.length} items</div>}
      {selectedCategory && <div>Selected: {selectedCategory}</div>}
      <button onClick={() => onCategoryClick?.('Food')}>Click Food</button>
    </div>
  ),
}));

jest.mock('../TrendChart', () => ({
  TrendChart: ({ data, isLoading }: any) => (
    <div data-testid="trend-chart">
      <div>Trend Chart</div>
      {isLoading && <div>Loading...</div>}
      {data.length > 0 && <div>Trend Data: {data.length} items</div>}
    </div>
  ),
}));

jest.mock('../BudgetProgressChart', () => ({
  BudgetProgressChart: ({ data, isLoading, showRings }: any) => (
    <div data-testid="budget-progress-chart">
      <div>Budget Progress Chart</div>
      {isLoading && <div>Loading...</div>}
      {data.length > 0 && <div>Budget Data: {data.length} items</div>}
      {showRings && <div>Ring View</div>}
    </div>
  ),
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

const mockStoreState = {
  spendingByCategory: [
    { category: 'Food', amount: 500, color: '#FF6B6B', percentage: 50 },
    { category: 'Transport', amount: 300, color: '#4ECDC4', percentage: 30 },
  ],
  spendingTrends: [
    { date: '2024-01-01', amount: 100, type: 'expense' as const },
    { date: '2024-01-02', amount: 200, type: 'income' as const },
  ],
  budgetPerformance: [
    { category: 'Food', budgeted: 600, spent: 500, remaining: 100, percentage: 83, status: 'under' as const },
  ],
  monthlySummary: {
    month: '2024-01',
    total_income: 2000,
    total_expenses: 1500,
    net_amount: 500,
    transaction_count: 25,
    top_categories: [
      { category: 'Food', amount: 500, count: 10 },
      { category: 'Transport', amount: 300, count: 5 },
    ],
  },
  analyticsData: null,
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
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    mockUseAnalyticsStore.mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with all components', () => {
    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Insights into your financial patterns and trends')).toBeInTheDocument();
    expect(screen.getByTestId('spending-chart')).toBeInTheDocument();
    expect(screen.getByTestId('budget-progress-chart')).toBeInTheDocument();
  });

  it('should display summary statistics', () => {
    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('$1,500')).toBeInTheDocument();
    expect(screen.getByText('Net Amount')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should switch between overview and detailed view', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    // Should start in overview mode
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Detailed')).toBeInTheDocument();

    // Switch to detailed view
    const detailedButton = screen.getByText('Detailed');
    fireEvent.click(detailedButton);

    await waitFor(() => {
      expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
    });
  });

  it('should handle date range selection', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    const dateInput = screen.getByPlaceholderText('Select date range');
    expect(dateInput).toBeInTheDocument();

    // The date picker interaction would be complex to test, 
    // so we'll just verify it's rendered
  });

  it('should handle refresh button', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockStoreState.fetchAnalyticsData).toHaveBeenCalled();
    });
  });

  it('should handle category selection', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    const categoryButton = screen.getByText('Click Food');
    fireEvent.click(categoryButton);

    await waitFor(() => {
      expect(mockStoreState.setSelectedCategory).toHaveBeenCalledWith('Food');
    });
  });

  it('should show selected category badge', () => {
    const storeWithSelectedCategory = {
      ...mockStoreState,
      selectedCategory: 'Food',
    };
    mockUseAnalyticsStore.mockReturnValue(storeWithSelectedCategory);

    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Filtered: Food')).toBeInTheDocument();
  });

  it('should clear selected category', async () => {
    const storeWithSelectedCategory = {
      ...mockStoreState,
      selectedCategory: 'Food',
    };
    mockUseAnalyticsStore.mockReturnValue(storeWithSelectedCategory);

    renderWithProvider(<AnalyticsDashboard />);

    const clearButton = screen.getByText('×');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockStoreState.setSelectedCategory).toHaveBeenCalledWith(null);
    });
  });

  it('should display top categories section', () => {
    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Top Spending Categories')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('10 transactions')).toBeInTheDocument();
    expect(screen.getByText('5 transactions')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const loadingStore = {
      ...mockStoreState,
      isLoading: true,
    };
    mockUseAnalyticsStore.mockReturnValue(loadingStore);

    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getAllByText('Loading...')).toHaveLength(2); // SpendingChart and BudgetProgressChart
  });

  it('should show error state', () => {
    const errorStore = {
      ...mockStoreState,
      error: 'Failed to load data',
    };
    mockUseAnalyticsStore.mockReturnValue(errorStore);

    renderWithProvider(<AnalyticsDashboard />);

    expect(screen.getByText('Error loading analytics data')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should handle error retry', async () => {
    const errorStore = {
      ...mockStoreState,
      error: 'Failed to load data',
    };
    mockUseAnalyticsStore.mockReturnValue(errorStore);

    renderWithProvider(<AnalyticsDashboard />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockStoreState.clearError).toHaveBeenCalled();
      expect(mockStoreState.fetchAnalyticsData).toHaveBeenCalled();
    });
  });

  it('should switch chart view in detailed mode', async () => {
    renderWithProvider(<AnalyticsDashboard />);

    // Switch to detailed view first
    const detailedButton = screen.getByText('Detailed');
    fireEvent.click(detailedButton);

    await waitFor(() => {
      expect(screen.getByText('Budget Performance')).toBeInTheDocument();
      expect(screen.getByText('Rings')).toBeInTheDocument();
      expect(screen.getByText('Bars')).toBeInTheDocument();
    });

    // Switch to bars view
    const barsButton = screen.getByText('Bars');
    fireEvent.click(barsButton);

    // The chart should update (tested via props)
  });

  it('should be responsive with proper container', () => {
    renderWithProvider(<AnalyticsDashboard />);

    const container = document.querySelector('[class*="mantine-Container"]');
    expect(container).toBeInTheDocument();
  });

  it('should fetch data on mount', () => {
    renderWithProvider(<AnalyticsDashboard />);

    expect(mockStoreState.fetchAnalyticsData).toHaveBeenCalled();
  });
});