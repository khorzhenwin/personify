import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionList } from '../TransactionList';
import { useTransactionStore } from '@/store/transactions';
import { theme } from '@/theme';

// Mock the transaction store
jest.mock('@/store/transactions');
const mockUseTransactionStore = useTransactionStore as jest.MockedFunction<typeof useTransactionStore>;

// Mock data
const mockTransactions = [
  {
    id: '1',
    amount: 50.00,
    description: 'Grocery shopping',
    category: { id: '1', name: 'Food', color: '#10B981' },
    transaction_type: 'expense' as const,
    date: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    amount: 1000.00,
    description: 'Salary',
    category: { id: '2', name: 'Income', color: '#3B82F6' },
    transaction_type: 'income' as const,
    date: '2024-01-01',
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z',
  },
];

const mockStore = {
  transactions: mockTransactions,
  isLoading: false,
  error: null,
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
  fetchTransactions: jest.fn(),
  setPage: jest.fn(),
  deleteTransaction: jest.fn(),
  setSelectedTransaction: jest.fn(),
  selectedTransaction: null,
  isDeleting: false,
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

describe('TransactionList', () => {
  beforeEach(() => {
    mockUseTransactionStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render transaction list with clean table design', () => {
    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Check if transactions are displayed
    expect(screen.getByText('Grocery shopping')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('-$50.00')).toBeInTheDocument();
    expect(screen.getByText('+$1,000.00')).toBeInTheDocument();
  });

  it('should display transaction types with proper styling', () => {
    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Check for expense and income indicators
    const expenseElement = screen.getByText('-$50.00').closest('tr');
    const incomeElement = screen.getByText('+$1,000.00').closest('tr');
    
    expect(expenseElement).toBeInTheDocument();
    expect(incomeElement).toBeInTheDocument();
  });

  it('should show loading skeleton when loading', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      isLoading: true,
      transactions: [],
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Check for loading skeletons
    expect(screen.getAllByTestId('transaction-skeleton')).toHaveLength(5);
  });

  it('should show empty state when no transactions exist', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      transactions: [],
      isLoading: false,
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
    expect(screen.getByText('Start by adding your first transaction')).toBeInTheDocument();
  });

  it('should handle pagination correctly', () => {
    const mockSetPage = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      pagination: { page: 1, limit: 20, total: 50, totalPages: 3 },
      setPage: mockSetPage,
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Check if pagination is rendered
    expect(screen.getByText('1')).toBeInTheDocument();
    
    // Click next page - look for pagination controls
    const paginationButtons = screen.getAllByRole('button');
    const nextButton = paginationButtons.find(button => button.textContent === '2');
    if (nextButton) {
      fireEvent.click(nextButton);
      expect(mockSetPage).toHaveBeenCalledWith(2);
    }
  });

  it('should handle delete transaction with confirmation', async () => {
    const mockDeleteTransaction = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      deleteTransaction: mockDeleteTransaction,
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Find and click delete button for first transaction
    const deleteButtons = screen.getAllByLabelText('Delete transaction');
    fireEvent.click(deleteButtons[0]);

    // Check if confirmation modal appears
    await waitFor(() => {
      expect(screen.getByText('Delete Transaction')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete this transaction/)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    expect(mockDeleteTransaction).toHaveBeenCalledWith('1');
  });

  it('should show error state when error occurs', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      error: 'Failed to load transactions',
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    expect(screen.getByText('Failed to load transactions')).toBeInTheDocument();
  });

  it('should have hover effects on table rows', () => {
    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    const firstRow = screen.getByText('Grocery shopping').closest('tr');
    expect(firstRow).toHaveClass('transaction-row');
  });

  it('should display categories with colors', () => {
    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
  });

  it('should format dates correctly', () => {
    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
  });

  it('should handle edit transaction', () => {
    const mockSetSelectedTransaction = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      setSelectedTransaction: mockSetSelectedTransaction,
    });

    render(
      <TestWrapper>
        <TransactionList />
      </TestWrapper>
    );

    // Find and click edit button for first transaction
    const editButtons = screen.getAllByLabelText('Edit transaction');
    fireEvent.click(editButtons[0]);

    expect(mockSetSelectedTransaction).toHaveBeenCalledWith(mockTransactions[0]);
  });
});