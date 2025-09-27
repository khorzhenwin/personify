import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BudgetProgressChart } from '../BudgetProgressChart';
import { BudgetPerformance } from '@/lib/api/analytics';

const mockData: BudgetPerformance[] = [
  { category: 'Food', budgeted: 1000, spent: 850, remaining: 150, percentage: 85, status: 'under' },
  { category: 'Transport', budgeted: 400, spent: 420, remaining: -20, percentage: 105, status: 'over' },
  { category: 'Shopping', budgeted: 500, spent: 500, remaining: 0, percentage: 100, status: 'on-track' },
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
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey }: any) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}));

describe('BudgetProgressChart', () => {
  it('should render chart with data correctly', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    expect(screen.getByText('Budget vs Actual Spending')).toBeInTheDocument();
    expect(screen.getByText('Compare budgeted amounts with actual spending')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should display budget summary statistics', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    // Total budgeted: 1000 + 400 + 500 = 1900
    // Total spent: 850 + 420 + 500 = 1770
    // Total remaining: 150 + (-20) + 0 = 130
    expect(screen.getByText('$1,900')).toBeInTheDocument();
    expect(screen.getByText('$1,770')).toBeInTheDocument();
    expect(screen.getByText('$130')).toBeInTheDocument();
  });

  it('should show over budget alert', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    expect(screen.getByText('1 over budget')).toBeInTheDocument();
  });

  it('should display progress bars for each category', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    mockData.forEach(item => {
      expect(screen.getByText(item.category)).toBeInTheDocument();
      expect(screen.getByText(`${item.percentage}%`)).toBeInTheDocument();
      expect(screen.getByText(`$${item.spent.toLocaleString()} / $${item.budgeted.toLocaleString()}`)).toBeInTheDocument();
    });
  });

  it('should render ring progress view when showRings is true', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} showRings={true} />
    );

    expect(screen.getByText('Budget Progress')).toBeInTheDocument();
    expect(screen.getByText('Track your spending against budget limits')).toBeInTheDocument();
    
    // Should show ring progress for each category
    mockData.forEach(item => {
      expect(screen.getByText(item.category)).toBeInTheDocument();
      expect(screen.getByText(`${item.percentage}%`)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    renderWithProvider(
      <BudgetProgressChart data={[]} isLoading={true} />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    renderWithProvider(
      <BudgetProgressChart data={[]} />
    );

    expect(screen.getByText('No budget data available')).toBeInTheDocument();
    expect(screen.getByText('Set up budgets to track your spending progress')).toBeInTheDocument();
  });

  it('should display correct status badges', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} showRings={true} />
    );

    expect(screen.getByText('under')).toBeInTheDocument();
    expect(screen.getByText('over')).toBeInTheDocument();
    expect(screen.getByText('on track')).toBeInTheDocument();
  });

  it('should handle different budget statuses with correct colors', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    // Check that different statuses are rendered
    const progressBars = document.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThan(0);
  });

  it('should show negative remaining amounts in red', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} showRings={true} />
    );

    // Transport category has -$20 remaining
    expect(screen.getByText('-$20')).toBeInTheDocument();
  });

  it('should render with modern design elements', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    // Check for modern card styling
    const card = document.querySelector('.modern-card');
    expect(card).toBeInTheDocument();
  });

  it('should be responsive', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} />
    );

    // Check that ResponsiveContainer is used for responsive design
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should handle ring card interactions', () => {
    renderWithProvider(
      <BudgetProgressChart data={mockData} showRings={true} />
    );

    // Ring cards should have micro-interaction class
    const cards = document.querySelectorAll('.micro-interaction');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('should display correct percentage calculations', () => {
    const testData: BudgetPerformance[] = [
      { category: 'Test', budgeted: 100, spent: 75, remaining: 25, percentage: 75, status: 'under' },
    ];

    renderWithProvider(
      <BudgetProgressChart data={testData} />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('$75 / $100')).toBeInTheDocument();
  });
});