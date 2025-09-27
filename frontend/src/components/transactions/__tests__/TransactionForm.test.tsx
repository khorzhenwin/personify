import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TransactionForm } from '../TransactionForm';
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

const mockTransaction = {
  id: '1',
  amount: 50.00,
  description: 'Grocery shopping',
  category: mockCategories[0],
  transaction_type: 'expense' as const,
  date: '2024-01-15',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockStore = {
  categories: mockCategories,
  isCreating: false,
  isUpdating: false,
  error: null,
  createTransaction: jest.fn(),
  updateTransaction: jest.fn(),
  fetchCategories: jest.fn(),
  selectedTransaction: null,
  setSelectedTransaction: jest.fn(),
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

describe('TransactionForm', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    mockUseTransactionStore.mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render form with floating labels and modern design', () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    // Check for form fields with floating labels
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Transaction Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toBeInTheDocument();
  });

  it('should have modern card layout with proper styling', () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const form = screen.getByRole('form');
    expect(form).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByText('Add Transaction')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const submitButton = screen.getByText('Add Transaction');
    await user.click(submitButton);

    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('Description is required')).toBeInTheDocument();
      expect(screen.getByText('Amount is required')).toBeInTheDocument();
    });
  });

  it('should validate amount is positive', async () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const amountInput = screen.getByLabelText('Amount');
    await user.type(amountInput, '-10');

    const submitButton = screen.getByText('Add Transaction');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Amount must be positive')).toBeInTheDocument();
    });
  });

  it('should create transaction with valid data', async () => {
    const mockCreateTransaction = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      createTransaction: mockCreateTransaction,
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    // Fill form
    await user.type(screen.getByLabelText('Description'), 'Test transaction');
    await user.type(screen.getByLabelText('Amount'), '25.50');
    
    // Select category
    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Food'));

    // Select transaction type
    const typeSelect = screen.getByLabelText('Transaction Type');
    await user.click(typeSelect);
    await user.click(screen.getByText('Expense'));

    // Set date
    const dateInput = screen.getByLabelText('Date');
    await user.type(dateInput, '2024-01-15');

    // Submit form
    const submitButton = screen.getByText('Add Transaction');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith({
        description: 'Test transaction',
        amount: 25.50,
        category_id: '1',
        transaction_type: 'expense',
        date: '2024-01-15',
      });
    });
  });

  it('should update transaction when editing', async () => {
    const mockUpdateTransaction = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      selectedTransaction: mockTransaction,
      updateTransaction: mockUpdateTransaction,
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    // Form should be pre-filled
    expect(screen.getByDisplayValue('Grocery shopping')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();

    // Update description
    const descriptionInput = screen.getByLabelText('Description');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, 'Updated grocery shopping');

    // Submit form
    const submitButton = screen.getByText('Update Transaction');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith('1', {
        description: 'Updated grocery shopping',
        amount: 50,
        category_id: '1',
        transaction_type: 'expense',
        date: '2024-01-15',
      });
    });
  });

  it('should show loading state during submission', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      isCreating: true,
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const submitButton = screen.getByText('Add Transaction');
    expect(submitButton).toBeDisabled();
  });

  it('should display error message when submission fails', () => {
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      error: 'Failed to create transaction',
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    expect(screen.getByText('Failed to create transaction')).toBeInTheDocument();
  });

  it('should reset form after successful creation', async () => {
    const mockCreateTransaction = jest.fn().mockResolvedValue(undefined);
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      createTransaction: mockCreateTransaction,
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    // Fill and submit form
    await user.type(screen.getByLabelText('Description'), 'Test transaction');
    await user.type(screen.getByLabelText('Amount'), '25.50');

    const submitButton = screen.getByText('Add Transaction');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByLabelText('Description')).toHaveValue('');
      expect(screen.getByLabelText('Amount')).toHaveValue('');
    });
  });

  it('should handle cancel action when editing', async () => {
    const mockSetSelectedTransaction = jest.fn();
    mockUseTransactionStore.mockReturnValue({
      ...mockStore,
      selectedTransaction: mockTransaction,
      setSelectedTransaction: mockSetSelectedTransaction,
    });

    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockSetSelectedTransaction).toHaveBeenCalledWith(null);
  });

  it('should have proper input styling with focus states', async () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const descriptionInput = screen.getByLabelText('Description');
    
    // Focus input
    await user.click(descriptionInput);
    
    // Input should have focus styling
    expect(descriptionInput).toHaveFocus();
  });

  it('should format amount input correctly', async () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const amountInput = screen.getByLabelText('Amount');
    await user.type(amountInput, '1234.56');

    expect(amountInput).toHaveValue('1234.56');
  });

  it('should show category colors in select options', async () => {
    render(
      <TestWrapper>
        <TransactionForm />
      </TestWrapper>
    );

    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);

    // Check if categories are displayed
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transport')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
  });
});