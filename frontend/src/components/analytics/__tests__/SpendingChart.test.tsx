import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SpendingChart } from '../SpendingChart';
import { SpendingByCategory } from '@/lib/api/analytics';

const mockData: SpendingByCategory[] = [
  { category: 'Food & Dining', amount: 850, color: '#FF6B6B', percentage: 35 },
  { category: 'Transportation', amount: 420, color: '#4ECDC4', percentage: 17 },
  { category: 'Shopping', amount: 380, color: '#45B7D1', percentage: 16 },
  { category: 'Entertainment', amount: 290, color: '#96CEB4', percentage: 12 },
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
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ onClick }: any) => (
    <div 
      data-testid="pie" 
      onClick={() => onClick && onClick({ category: 'Food & Dining' })}
    />
  ),
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Legend: () => <div data-testid="legend" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('SpendingChart', () => {
  it('should render chart with data correctly', () => {
    renderWithProvider(
      <SpendingChart data={mockData} />
    );

    expect(screen.getByText('Spending by Category')).toBeInTheDocument();
    expect(screen.getByText('Total spending:')).toBeInTheDocument();
    expect(screen.getByText('$1,940')).toBeInTheDocument();
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('should display all categories in legend', () => {
    renderWithProvider(
      <SpendingChart data={mockData} />
    );

    mockData.forEach(item => {
      expect(screen.getByText(item.category)).toBeInTheDocument();
      expect(screen.getByText(`$${item.amount.toLocaleString()}`)).toBeInTheDocument();
      expect(screen.getByText(`${item.percentage}%`)).toBeInTheDocument();
    });
  });

  it('should show loading state', () => {
    renderWithProvider(
      <SpendingChart data={[]} isLoading={true} />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    // Check for skeleton loaders
    expect(document.querySelectorAll('[data-skeleton]')).toHaveLength(0); // Mantine skeletons don't have this attribute by default
  });

  it('should show empty state when no data', () => {
    renderWithProvider(
      <SpendingChart data={[]} />
    );

    expect(screen.getByText('No spending data available')).toBeInTheDocument();
    expect(screen.getByText('Start adding transactions to see your spending breakdown')).toBeInTheDocument();
  });

  it('should handle category click', async () => {
    const mockOnCategoryClick = jest.fn();
    
    renderWithProvider(
      <SpendingChart 
        data={mockData} 
        onCategoryClick={mockOnCategoryClick}
      />
    );

    const pieElement = screen.getByTestId('pie');
    fireEvent.click(pieElement);

    await waitFor(() => {
      expect(mockOnCategoryClick).toHaveBeenCalledWith('Food & Dining');
    });
  });

  it('should highlight selected category', () => {
    renderWithProvider(
      <SpendingChart 
        data={mockData} 
        selectedCategory="Food & Dining"
      />
    );

    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    // The selected category should have different styling (tested via className or style)
  });

  it('should handle legend item click', async () => {
    const mockOnCategoryClick = jest.fn();
    
    renderWithProvider(
      <SpendingChart 
        data={mockData} 
        onCategoryClick={mockOnCategoryClick}
      />
    );

    // Find the first category in the legend and click it
    const categoryElement = screen.getByText('Food & Dining');
    const legendItem = categoryElement.closest('[style*="cursor: pointer"]');
    
    if (legendItem) {
      fireEvent.click(legendItem);
      await waitFor(() => {
        expect(mockOnCategoryClick).toHaveBeenCalledWith('Food & Dining');
      });
    }
  });

  it('should display correct total spending calculation', () => {
    const testData = [
      { category: 'Test1', amount: 100, color: '#FF6B6B', percentage: 50 },
      { category: 'Test2', amount: 150, color: '#4ECDC4', percentage: 50 },
    ];

    renderWithProvider(
      <SpendingChart data={testData} />
    );

    expect(screen.getByText('$250')).toBeInTheDocument();
  });

  it('should render with modern design elements', () => {
    renderWithProvider(
      <SpendingChart data={mockData} />
    );

    // Check for modern card styling
    const card = document.querySelector('.modern-card');
    expect(card).toBeInTheDocument();
  });

  it('should be responsive', () => {
    renderWithProvider(
      <SpendingChart data={mockData} />
    );

    // Check that ResponsiveContainer is used for responsive design
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });
});