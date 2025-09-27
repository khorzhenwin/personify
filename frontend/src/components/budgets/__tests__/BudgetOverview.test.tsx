import { render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BudgetOverview } from '../BudgetOverview';
import { useBudgetStore } from '@/store/budgets';
import { theme } from '@/theme';

// Mock the budget store
jest.mock('@/store/budgets');
const mockUseBudgetStore = useBudgetStore as jest.MockedFunction<typeof useBudgetStore>;

// Mock data
const mockBudgetOverview = {
  total_budget: 5000,
  total_spent: 3200,
  total_remaining: 1800,
  month: '2024-01',
  budgets: [
    {
      budget: {
        id: '1',
        category: {
          id: '1',
          name: 'Food',
          color: '#e74c3c',
          description: 'Food and dining'
        },
        amount: 800,
        month: '2024-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      spent: 650,
      remaining: 150,
      percentage: 81.25,
      is_exceeded: false
    },
    {
      budget: {
        id: '2',
        category: {
          id: '2',
          name: 'Transportation',
          color: '#3498db',
          description: 'Transport costs'
        },
        amount: 400,
        month: '2024-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      spent: 450,
      remaining: -50,
      percentage: 112.5,
      is_exceeded: true
    }
  ]
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {component}
    </MantineProvider>
  );
};

describe('BudgetOverview', () => {
  beforeEach(() => {
    mockUseBudgetStore.mockReturnValue({
      budgetOverview: mockBudgetOverview,
      isLoading: false,
      error: null,
      fetchBudgetOverview: jest.fn(),
      currentMonth: '2024-01',
      setCurrentMonth: jest.fn(),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render budget overview with modern progress rings', async () => {
    renderWithProvider(<BudgetOverview />);

    // Check if main overview cards are rendered
    expect(screen.getByText('Total Budget')).toBeInTheDocument();
    expect(screen.getByText('$5,000.00')).toBeInTheDocument();
    expect(screen.getByText('Total Spent')).toBeInTheDocument();
    expect(screen.getByText('$3,200.00')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
    expect(screen.getByText('$1,800.00')).toBeInTheDocument();

    // Check if progress rings are rendered (by checking for RingProgress components)
    const progressRings = screen.getAllByRole('progressbar');
    expect(progressRings).toHaveLength(3); // One for each budget category + overall
  });

  it('should display budget categories with correct progress indicators', () => {
    renderWithProvider(<BudgetOverview />);

    // Check if category names are displayed
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();

    // Check if amounts are displayed
    expect(screen.getByText('$650.00 / $800.00')).toBeInTheDocument();
    expect(screen.getByText('$450.00 / $400.00')).toBeInTheDocument();
  });

  it('should show exceeded budget with red color indicator', () => {
    renderWithProvider(<BudgetOverview />);

    // Transportation budget is exceeded, should show warning
    const transportationCard = screen.getByText('Transportation').closest('[data-testid="budget-card"]');
    expect(transportationCard).toHaveAttribute('data-exceeded', 'true');
  });

  it('should display gradient backgrounds on cards', () => {
    renderWithProvider(<BudgetOverview />);

    // Check if cards have gradient styling
    const budgetCards = screen.getAllByTestId('budget-card');
    budgetCards.forEach(card => {
      expect(card).toHaveStyle('background: linear-gradient');
    });
  });

  it('should show loading state with skeleton loaders', () => {
    mockUseBudgetStore.mockReturnValue({
      budgetOverview: null,
      isLoading: true,
      error: null,
      fetchBudgetOverview: jest.fn(),
      currentMonth: '2024-01',
      setCurrentMonth: jest.fn(),
    } as any);

    renderWithProvider(<BudgetOverview />);

    // Check for loading skeletons
    const skeletons = screen.getAllByTestId('budget-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state when data fails to load', () => {
    mockUseBudgetStore.mockReturnValue({
      budgetOverview: null,
      isLoading: false,
      error: 'Failed to load budget data',
      fetchBudgetOverview: jest.fn(),
      currentMonth: '2024-01',
      setCurrentMonth: jest.fn(),
    } as any);

    renderWithProvider(<BudgetOverview />);

    expect(screen.getByText('Failed to load budget data')).toBeInTheDocument();
  });

  it('should have smooth animations on progress rings', () => {
    renderWithProvider(<BudgetOverview />);

    // Check if progress rings have animation classes
    const progressRings = screen.getAllByRole('progressbar');
    progressRings.forEach(ring => {
      expect(ring).toHaveClass('animate-progress');
    });
  });

  it('should display month selector with current month', () => {
    renderWithProvider(<BudgetOverview />);

    // Check if month selector is present
    expect(screen.getByDisplayValue('January 2024')).toBeInTheDocument();
  });

  it('should call fetchBudgetOverview on mount', () => {
    const mockFetchBudgetOverview = jest.fn();
    mockUseBudgetStore.mockReturnValue({
      budgetOverview: null,
      isLoading: false,
      error: null,
      fetchBudgetOverview: mockFetchBudgetOverview,
      currentMonth: '2024-01',
      setCurrentMonth: jest.fn(),
    } as any);

    renderWithProvider(<BudgetOverview />);

    expect(mockFetchBudgetOverview).toHaveBeenCalledWith('2024-01');
  });
});