import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { BudgetForm } from '../BudgetForm';
import { useBudgetStore } from '@/store/budgets';
import { theme } from '@/theme';

// Mock the budget store
jest.mock('@/store/budgets');
const mockUseBudgetStore = useBudgetStore as jest.MockedFunction<typeof useBudgetStore>;

// Mock data
const mockCategories = [
  {
    id: '1',
    name: 'Food',
    color: '#e74c3c',
    description: 'Food and dining'
  },
  {
    id: '2',
    name: 'Transportation',
    color: '#3498db',
    description: 'Transport costs'
  }
];

const mockBudget = {
  id: '1',
  category: mockCategories[0],
  amount: 800,
  month: '2024-01',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {component}
    </MantineProvider>
  );
};

describe('BudgetForm', () => {
  const mockCreateBudget = jest.fn();
  const mockUpdateBudget = jest.fn();
  const mockFetchCategories = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockUseBudgetStore.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
      createBudget: mockCreateBudget,
      updateBudget: mockUpdateBudget,
      fetchCategories: mockFetchCategories,
      currentMonth: '2024-01',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render budget form with modern slider inputs', () => {
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Check form elements
    expect(screen.getByText('Create Budget')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Budget Amount')).toBeInTheDocument();
    
    // Check for slider input
    expect(screen.getByRole('slider')).toBeInTheDocument();
    
    // Check for real-time preview
    expect(screen.getByText('Budget Preview')).toBeInTheDocument();
  });

  it('should render in edit mode with existing budget data', () => {
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
        budget={mockBudget}
      />
    );

    expect(screen.getByText('Edit Budget')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Food')).toBeInTheDocument();
  });

  it('should show category color picker with visual feedback', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Open category select
    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);

    // Check if categories are displayed with colors
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    
    // Check for color indicators
    const colorIndicators = screen.getAllByTestId('category-color');
    expect(colorIndicators).toHaveLength(2);
  });

  it('should update slider value and show real-time preview', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Find and interact with slider
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '1200' } });

    // Check if preview updates
    await waitFor(() => {
      expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    });
  });

  it('should show visual feedback when amount changes', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Change amount via number input
    const amountInput = screen.getByLabelText('Budget Amount');
    await user.clear(amountInput);
    await user.type(amountInput, '1500');

    // Check if slider updates
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('1500');

    // Check if preview card updates
    expect(screen.getByText('$1,500.00')).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Try to submit without selecting category
    const submitButton = screen.getByText('Create Budget');
    await user.click(submitButton);

    // Check for validation error
    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });

  it('should validate minimum amount', async () => {
    const user = userEvent.setup();
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Set amount to 0
    const amountInput = screen.getByLabelText('Budget Amount');
    await user.clear(amountInput);
    await user.type(amountInput, '0');

    const submitButton = screen.getByText('Create Budget');
    await user.click(submitButton);

    // Check for validation error
    expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument();
  });

  it('should submit form with correct data', async () => {
    const user = userEvent.setup();
    mockCreateBudget.mockResolvedValue(mockBudget);
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Fill form
    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Food'));

    const amountInput = screen.getByLabelText('Budget Amount');
    await user.clear(amountInput);
    await user.type(amountInput, '800');

    // Submit form
    const submitButton = screen.getByText('Create Budget');
    await user.click(submitButton);

    // Check if createBudget was called with correct data
    await waitFor(() => {
      expect(mockCreateBudget).toHaveBeenCalledWith({
        category_id: '1',
        amount: 800,
        month: '2024-01'
      });
    });
  });

  it('should update existing budget', async () => {
    const user = userEvent.setup();
    mockUpdateBudget.mockResolvedValue(mockBudget);
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
        budget={mockBudget}
      />
    );

    // Change amount
    const amountInput = screen.getByLabelText('Budget Amount');
    await user.clear(amountInput);
    await user.type(amountInput, '1000');

    // Submit form
    const submitButton = screen.getByText('Update Budget');
    await user.click(submitButton);

    // Check if updateBudget was called
    await waitFor(() => {
      expect(mockUpdateBudget).toHaveBeenCalledWith('1', {
        category_id: '1',
        amount: 1000,
        month: '2024-01'
      });
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    mockCreateBudget.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Fill and submit form
    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Food'));

    const submitButton = screen.getByText('Create Budget');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should close form after successful submission', async () => {
    const user = userEvent.setup();
    mockCreateBudget.mockResolvedValue(mockBudget);
    
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Fill and submit form
    const categorySelect = screen.getByLabelText('Category');
    await user.click(categorySelect);
    await user.click(screen.getByText('Food'));

    const submitButton = screen.getByText('Create Budget');
    await user.click(submitButton);

    // Check if onClose was called
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should have smooth animations and transitions', () => {
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    // Check for animation classes
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('animate-modal');

    // Check for transition styles on preview card
    const previewCard = screen.getByTestId('budget-preview');
    expect(previewCard).toHaveStyle('transition: all 0.3s ease');
  });

  it('should fetch categories on mount', () => {
    renderWithProvider(
      <BudgetForm
        opened={true}
        onClose={mockOnClose}
        month="2024-01"
      />
    );

    expect(mockFetchCategories).toHaveBeenCalled();
  });
});