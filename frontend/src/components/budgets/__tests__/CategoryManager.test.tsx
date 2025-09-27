import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { CategoryManager } from '../CategoryManager';
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
    description: 'Food and dining expenses'
  },
  {
    id: '2',
    name: 'Transportation',
    color: '#3498db',
    description: 'Transport and travel costs'
  },
  {
    id: '3',
    name: 'Entertainment',
    color: '#9b59b6',
    description: 'Movies, games, and fun activities'
  }
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {component}
    </MantineProvider>
  );
};

describe('CategoryManager', () => {
  const mockCreateCategory = jest.fn();
  const mockUpdateCategory = jest.fn();
  const mockDeleteCategory = jest.fn();
  const mockFetchCategories = jest.fn();

  beforeEach(() => {
    mockUseBudgetStore.mockReturnValue({
      categories: mockCategories,
      isLoading: false,
      error: null,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      deleteCategory: mockDeleteCategory,
      fetchCategories: mockFetchCategories,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render categories in modern card-based layout', () => {
    renderWithProvider(<CategoryManager />);

    // Check if categories are rendered as cards
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Entertainment')).toBeInTheDocument();

    // Check for card layout
    const categoryCards = screen.getAllByTestId('category-card');
    expect(categoryCards).toHaveLength(3);
  });

  it('should display category colors and descriptions', () => {
    renderWithProvider(<CategoryManager />);

    // Check descriptions
    expect(screen.getByText('Food and dining expenses')).toBeInTheDocument();
    expect(screen.getByText('Transport and travel costs')).toBeInTheDocument();
    expect(screen.getByText('Movies, games, and fun activities')).toBeInTheDocument();

    // Check color indicators
    const colorIndicators = screen.getAllByTestId('category-color-indicator');
    expect(colorIndicators).toHaveLength(3);
  });

  it('should have hover effects on category cards', () => {
    renderWithProvider(<CategoryManager />);

    const categoryCards = screen.getAllByTestId('category-card');
    
    categoryCards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-lg');
      expect(card).toHaveClass('hover:scale-[1.02]');
      expect(card).toHaveStyle('transition: all 0.3s ease');
    });
  });

  it('should show create category button', () => {
    renderWithProvider(<CategoryManager />);

    const createButton = screen.getByText('Add Category');
    expect(createButton).toBeInTheDocument();
    expect(createButton).toHaveClass('animate-button');
  });

  it('should open create category modal when add button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<CategoryManager />);

    const createButton = screen.getByText('Add Category');
    await user.click(createButton);

    // Check if modal opens
    expect(screen.getByText('Create Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Category Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Color')).toBeInTheDocument();
  });

  it('should show edit and delete buttons on category cards', () => {
    renderWithProvider(<CategoryManager />);

    // Check for edit buttons
    const editButtons = screen.getAllByLabelText('Edit category');
    expect(editButtons).toHaveLength(3);

    // Check for delete buttons
    const deleteButtons = screen.getAllByLabelText('Delete category');
    expect(deleteButtons).toHaveLength(3);
  });

  it('should open edit modal when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<CategoryManager />);

    const editButtons = screen.getAllByLabelText('Edit category');
    await user.click(editButtons[0]);

    // Check if edit modal opens with pre-filled data
    expect(screen.getByText('Edit Category')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Food')).toBeInTheDocument();
  });

  it('should show delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<CategoryManager />);

    const deleteButtons = screen.getAllByLabelText('Delete category');
    await user.click(deleteButtons[0]);

    // Check for confirmation modal
    expect(screen.getByText('Delete Category')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete "Food"?')).toBeInTheDocument();
  });

  it('should create new category with form validation', async () => {
    const user = userEvent.setup();
    mockCreateCategory.mockResolvedValue({
      id: '4',
      name: 'Shopping',
      color: '#f39c12',
      description: 'Shopping expenses'
    });

    renderWithProvider(<CategoryManager />);

    // Open create modal
    await user.click(screen.getByText('Add Category'));

    // Fill form
    await user.type(screen.getByLabelText('Category Name'), 'Shopping');
    await user.type(screen.getByLabelText('Description'), 'Shopping expenses');
    
    // Change color
    const colorInput = screen.getByLabelText('Color');
    await user.clear(colorInput);
    await user.type(colorInput, '#f39c12');

    // Submit form
    await user.click(screen.getByText('Create Category'));

    // Check if createCategory was called
    await waitFor(() => {
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: 'Shopping',
        description: 'Shopping expenses',
        color: '#f39c12'
      });
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderWithProvider(<CategoryManager />);

    // Open create modal
    await user.click(screen.getByText('Add Category'));

    // Try to submit without name
    await user.click(screen.getByText('Create Category'));

    // Check for validation error
    expect(screen.getByText('Category name is required')).toBeInTheDocument();
  });

  it('should update existing category', async () => {
    const user = userEvent.setup();
    mockUpdateCategory.mockResolvedValue(mockCategories[0]);

    renderWithProvider(<CategoryManager />);

    // Open edit modal
    const editButtons = screen.getAllByLabelText('Edit category');
    await user.click(editButtons[0]);

    // Update name
    const nameInput = screen.getByDisplayValue('Food');
    await user.clear(nameInput);
    await user.type(nameInput, 'Food & Dining');

    // Submit form
    await user.click(screen.getByText('Update Category'));

    // Check if updateCategory was called
    await waitFor(() => {
      expect(mockUpdateCategory).toHaveBeenCalledWith('1', {
        name: 'Food & Dining',
        description: 'Food and dining expenses',
        color: '#e74c3c'
      });
    });
  });

  it('should delete category after confirmation', async () => {
    const user = userEvent.setup();
    mockDeleteCategory.mockResolvedValue(true);

    renderWithProvider(<CategoryManager />);

    // Open delete confirmation
    const deleteButtons = screen.getAllByLabelText('Delete category');
    await user.click(deleteButtons[0]);

    // Confirm deletion
    await user.click(screen.getByText('Delete'));

    // Check if deleteCategory was called
    await waitFor(() => {
      expect(mockDeleteCategory).toHaveBeenCalledWith('1');
    });
  });

  it('should show loading state during operations', async () => {
    const user = userEvent.setup();
    mockCreateCategory.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    renderWithProvider(<CategoryManager />);

    // Open create modal and submit
    await user.click(screen.getByText('Add Category'));
    await user.type(screen.getByLabelText('Category Name'), 'Test');
    await user.click(screen.getByText('Create Category'));

    // Check loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
  });

  it('should show empty state when no categories exist', () => {
    mockUseBudgetStore.mockReturnValue({
      categories: [],
      isLoading: false,
      error: null,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      deleteCategory: mockDeleteCategory,
      fetchCategories: mockFetchCategories,
    } as any);

    renderWithProvider(<CategoryManager />);

    expect(screen.getByText('No categories yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first category to start organizing your transactions')).toBeInTheDocument();
  });

  it('should show loading skeletons when loading', () => {
    mockUseBudgetStore.mockReturnValue({
      categories: [],
      isLoading: true,
      error: null,
      createCategory: mockCreateCategory,
      updateCategory: mockUpdateCategory,
      deleteCategory: mockDeleteCategory,
      fetchCategories: mockFetchCategories,
    } as any);

    renderWithProvider(<CategoryManager />);

    const skeletons = screen.getAllByTestId('category-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should have smooth transitions on all interactive elements', () => {
    renderWithProvider(<CategoryManager />);

    // Check card transitions
    const categoryCards = screen.getAllByTestId('category-card');
    categoryCards.forEach(card => {
      expect(card).toHaveStyle('transition: all 0.3s ease');
    });

    // Check button transitions
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveClass('transition-all');
    });
  });

  it('should fetch categories on mount', () => {
    renderWithProvider(<CategoryManager />);
    expect(mockFetchCategories).toHaveBeenCalled();
  });
});