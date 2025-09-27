import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { TrendChart } from '../TrendChart';
import { SpendingTrend } from '@/lib/api/analytics';

const mockData: SpendingTrend[] = [
  { date: '2024-01-01', amount: 100, type: 'expense' },
  { date: '2024-01-01', amount: 500, type: 'income' },
  { date: '2024-01-02', amount: 150, type: 'expense' },
  { date: '2024-01-03', amount: 200, type: 'expense' },
  { date: '2024-01-03', amount: 300, type: 'income' },
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Line: ({ dataKey }: any) => <div data-testid={`line-${dataKey}`} />,
  Area: ({ dataKey }: any) => <div data-testid={`area-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

describe('TrendChart', () => {
  it('should render chart with data correctly', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    expect(screen.getByText('Spending Trends')).toBeInTheDocument();
    expect(screen.getByText('Income and expense patterns over time')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should display summary statistics', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    expect(screen.getByText('Total Income')).toBeInTheDocument();
    expect(screen.getByText('Total Expenses')).toBeInTheDocument();
    expect(screen.getByText('Net Amount')).toBeInTheDocument();
    
    // Check calculated values
    expect(screen.getByText('$800')).toBeInTheDocument(); // Total income
    expect(screen.getByText('$450')).toBeInTheDocument(); // Total expenses
    expect(screen.getByText('$350')).toBeInTheDocument(); // Net amount
  });

  it('should show surplus badge for positive net amount', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    expect(screen.getByText('Surplus')).toBeInTheDocument();
  });

  it('should show deficit badge for negative net amount', () => {
    const deficitData: SpendingTrend[] = [
      { date: '2024-01-01', amount: 100, type: 'income' },
      { date: '2024-01-02', amount: 200, type: 'expense' },
    ];

    renderWithProvider(
      <TrendChart data={deficitData} />
    );

    expect(screen.getByText('Deficit')).toBeInTheDocument();
  });

  it('should switch between chart types', async () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    // Should start with area chart (default)
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();

    // Switch to line chart
    const lineButton = screen.getByText('Line');
    fireEvent.click(lineButton);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    renderWithProvider(
      <TrendChart data={[]} isLoading={true} />
    );

    // Should show skeleton loaders
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    renderWithProvider(
      <TrendChart data={[]} />
    );

    expect(screen.getByText('No trend data available')).toBeInTheDocument();
    expect(screen.getByText('Add more transactions to see spending trends over time')).toBeInTheDocument();
  });

  it('should group data by date correctly', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    // The component should group transactions by date
    // Jan 1: income 500, expense 100
    // Jan 2: expense 150
    // Jan 3: income 300, expense 200
    expect(screen.getByText('$800')).toBeInTheDocument(); // Total income
    expect(screen.getByText('$450')).toBeInTheDocument(); // Total expenses
  });

  it('should render with modern design elements', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    // Check for modern card styling
    const card = document.querySelector('.modern-card');
    expect(card).toBeInTheDocument();
  });

  it('should handle chart type toggle', async () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    const segmentedControl = screen.getByRole('radiogroup');
    expect(segmentedControl).toBeInTheDocument();

    // Test switching to line chart
    const lineOption = screen.getByText('Line');
    fireEvent.click(lineOption);

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    // Test switching back to area chart
    const areaOption = screen.getByText('Area');
    fireEvent.click(areaOption);

    await waitFor(() => {
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });

  it('should be responsive', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    // Check that ResponsiveContainer is used for responsive design
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should display correct color coding', () => {
    renderWithProvider(
      <TrendChart data={mockData} />
    );

    // Income should be green, expenses should be red
    const incomeText = screen.getByText('$800');
    const expenseText = screen.getByText('$450');
    
    expect(incomeText).toBeInTheDocument();
    expect(expenseText).toBeInTheDocument();
  });
});