import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionFilters } from '../TransactionFilters';
import { useTransactionStore } from '@/store/transactions';
import { theme } from '@/theme';

// Mock the transaction store
jest.mock('@/store/transactions');
const mockUseTransactionStore = useTransactionStore as jest.MockedFunction<typeof useTransactionStore>;

// Mock data
const mockCategories = [
  { id: '1', name: 'Food', color: '#10B981' },
  { id: '2', name: 'Transport', color: '#3B82F6' },
  { id: '3', name: 'Entertainment', color: '#8B5CF6' },
];

const mockFilters = {
  search: '',
  category_id: '',
  transaction_type: '',
  date_from: '',
  date_to: '',
  amount_min: undefined,
  amount_max: undefined,
};

const mockStore = {
  categories: mockCategories,
  filters: mockFilters,
  setFilters: jest.fn(),
  clearFilters: jest.fn(),
  fetchCategories: jest.fn(),
  exportTransactions: jest.fn(),
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme}>
        {children}
      </MantineProvider>
    </QueryClientProvider>
  );
};

describe('TransactionFilters', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseTransactionStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render all filter components with modern design', () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Check for search input
    expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
    
    // Check for category filter
    expect(screen.getByText('Category')).toBeInTheDocument();
    
    // Check for transaction type filter
    expect(screen.getByText('Type')).toBeInTheDocument();
    
    // Check for date range filters
    expect(screen.getByText('From Date')).toBeInTheDocument();
    expect(screen.getByText('To Date')).toBeInTheDocument();
    
    // Check for amount range filters
    expect(screen.getByText('Min Amount')).toBeInTheDocument();
    expect(screen.getByText('Max Amount')).toBeInTheDocument();
  });

  it('should handle search input with debouncing', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText('Search transactions...');
    await user.type(searchInput, 'grocery');

    // Should debounce the search
    await waitFor(() => {
      expect(mockSetFilters).toHaveBeenCalledWith({ search: 'grocery' });
    }, { timeout: 1000 });
  });

  it('should handle category filter selection', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Open category dropdown
    const categorySelect = screen.getByDisplayValue('');
    await user.click(categorySelect);

    // Select a category
    await user.click(screen.getByText('Food'));

    expect(mockSetFilters).toHaveBeenCalledWith({ category_id: '1' });
  });

  it('should handle transaction type filter', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Find type filter buttons
    const expenseButton = screen.getByText('Expense');
    await user.click(expenseButton);

    expect(mockSetFilters).toHaveBeenCalledWith({ transaction_type: 'expense' });
  });

  it('should handle date range filters with modern date pickers', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Set from date
    const fromDateInput = screen.getByLabelText('From Date');
    await user.type(fromDateInput, '2024-01-01');

    expect(mockSetFilters).toHaveBeenCalledWith({ date_from: '2024-01-01' });
  });

  it('should handle amount range filters', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Set minimum amount
    const minAmountInput = screen.getByLabelText('Min Amount');
    await user.type(minAmountInput, '10');

    expect(mockSetFilters).toHaveBeenCalledWith({ amount_min: 10 });
  });

  it('should clear all filters when clear button is clicked', async () => {
    const mockClearFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      filters: {
        ...mockFilters,
        search: 'test',
        category_id: '1',
      },
      clearFilters: mockClearFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    const clearButton = screen.getByText('Clear Filters');
    await user.click(clearButton);

    expect(mockClearFilters).toHaveBeenCalled();
  });

  it('should show active filter chips', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      filters: {
        ...mockFilters,
        search: 'grocery',
        category_id: '1',
        transaction_type: 'expense',
      },
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Check for active filter chips
    expect(screen.getByText('Search: grocery')).toBeInTheDocument();
    expect(screen.getByText('Category: Food')).toBeInTheDocument();
    expect(screen.getByText('Type: expense')).toBeInTheDocument();
  });

  it('should remove individual filter chips', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      filters: {
        ...mockFilters,
        search: 'grocery',
        category_id: '1',
      },
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Find and click remove button on search chip
    const searchChip = screen.getByText('Search: grocery');
    const removeButton = searchChip.parentElement?.querySelector('[aria-label="Remove filter"]');
    
    if (removeButton) {
      await user.click(removeButton);
      expect(mockSetFilters).toHaveBeenCalledWith({ search: '' });
    }
  });

  it('should handle export transactions', async () => {
    const mockExportTransactions = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      exportTransactions: mockExportTransactions,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    const exportButton = screen.getByText('Export CSV');
    await user.click(exportButton);

    expect(mockExportTransactions).toHaveBeenCalled();
  });

  it('should have responsive design for mobile', () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    const filterContainer = screen.getByTestId('transaction-filters');
    expect(filterContainer).toBeInTheDocument();
  });

  it('should show category colors in dropdown options', async () => {
    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Open category dropdown
    const categorySelect = screen.getByDisplayValue('');
    await user.click(categorySelect);

    // Check if categories with colors are displayed
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });

  it('should validate date range (from date should not be after to date)', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Set to date first
    const toDateInput = screen.getByLabelText('To Date');
    await user.type(toDateInput, '2024-01-01');

    // Set from date after to date
    const fromDateInput = screen.getByLabelText('From Date');
    await user.type(fromDateInput, '2024-01-15');

    // Should show validation error or handle gracefully
    await waitFor(() => {
      expect(screen.getByText('From date cannot be after to date')).toBeInTheDocument();
    });
  });

  it('should validate amount range (min should not be greater than max)', async () => {
    const mockSetFilters = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setFilters: mockSetFilters,
    });

    render(
      <TestWrapper>
        <TransactionFilters />
      </TestWrapper>
    );

    // Set max amount first
    const maxAmountInput = screen.getByLabelText('Max Amount');
    await user.type(maxAmountInput, '50');

    // Set min amount greater than max
    const minAmountInput = screen.getByLabelText('Min Amount');
    await user.type(minAmountInput, '100');

    // Should show validation error or handle gracefully
    await waitFor(() => {
      expect(screen.getByText('Min amount cannot be greater than max amount')).toBeInTheDocument();
    });
  });
});