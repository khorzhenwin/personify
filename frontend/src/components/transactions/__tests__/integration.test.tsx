import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/theme';

// Mock the transaction store
jest.mock('@/store/transactions', () => ({
  useTransactionStore: () => ({
    transactions: [],
    categories: [],
    filters: {},
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    fetchTransactions: jest.fn(),
    fetchCategories: jest.fn(),
    setFilters: jest.fn(),
    clearFilters: jest.fn(),
    exportTransactions: jest.fn(),
    createTransaction: jest.fn(),
    updateTransaction: jest.fn(),
    deleteTransaction: jest.fn(),
    setSelectedTransaction: jest.fn(),
    selectedTransaction: null,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    setPage: jest.fn(),
  }),
}));

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

describe('Transaction Components Integration', () => {
  it('should render transaction management interface', async () => {
    const TransactionsPage = (await import('@/app/transactions/page')).default;
    
    render(
      <TestWrapper>
        <TransactionsPage />
      </TestWrapper>
    );

    // Check if main elements are present
    expect(screen.getByText('Transactions')).toBeInTheDocument();
    expect(screen.getByText('Add Transaction')).toBeInTheDocument();
  });
});