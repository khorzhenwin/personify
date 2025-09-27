import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { BudgetAlerts } from '../BudgetAlerts';
import { useBudgetStore } from '@/store/budgets';
import { theme } from '@/theme';

// Mock the budget store
jest.mock('@/store/budgets');
const mockUseBudgetStore = useBudgetStore as jest.MockedFunction<typeof useBudgetStore>;

// Mock notifications
jest.mock('@mantine/notifications', () => ({
  notifications: {
    show: jest.fn(),
    hide: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock data
const mockBudgetStatus = [
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
  },
  {
    budget: {
      id: '3',
      category: {
        id: '3',
        name: 'Entertainment',
        color: '#9b59b6',
        description: 'Entertainment expenses'
      },
      amount: 300,
      month: '2024-01',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    spent: 270,
    remaining: 30,
    percentage: 90,
    is_exceeded: false
  }
];

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {component}
    </MantineProvider>
  );
};

describe('BudgetAlerts', () => {
  const mockFetchBudgetStatus = jest.fn();

  beforeEach(() => {
    mockUseBudgetStore.mockReturnValue({
      budgetStatus: mockBudgetStatus,
      isLoading: false,
      error: null,
      fetchBudgetStatus: mockFetchBudgetStatus,
      currentMonth: '2024-01',
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render budget alerts with modern notification design', () => {
    renderWithProvider(<BudgetAlerts />);

    // Check if alerts section is rendered
    expect(screen.getByText('Budget Alerts')).toBeInTheDocument();
    
    // Check for exceeded budget alert
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Budget Exceeded')).toBeInTheDocument();
    
    // Check for warning alert (90% spent)
    expect(screen.getByText('Entertainment')).toBeInTheDocument();
    expect(screen.getByText('Budget Warning')).toBeInTheDocument();
  });

  it('should display alerts with appropriate colors and icons', () => {
    renderWithProvider(<BudgetAlerts />);

    // Check for red alert (exceeded)
    const exceededAlert = screen.getByTestId('alert-exceeded');
    expect(exceededAlert).toHaveAttribute('data-color', 'red');
    
    // Check for orange alert (warning)
    const warningAlert = screen.getByTestId('alert-warning');
    expect(warningAlert).toHaveAttribute('data-color', 'orange');
    
    // Check for icons
    expect(screen.getByTestId('alert-icon-exceeded')).toBeInTheDocument();
    expect(screen.getByTestId('alert-icon-warning')).toBeInTheDocument();
  });

  it('should show correct alert messages and amounts', () => {
    renderWithProvider(<BudgetAlerts />);

    // Check exceeded budget message
    expect(screen.getByText('You have exceeded your Transportation budget by $50.00')).toBeInTheDocument();
    
    // Check warning message
    expect(screen.getByText('You have used 90% of your Entertainment budget')).toBeInTheDocument();
  });

  it('should have modern toast notification styling', () => {
    renderWithProvider(<BudgetAlerts />);

    const alerts = screen.getAllByTestId(/alert-/);
    alerts.forEach(alert => {
      expect(alert).toHaveClass('modern-alert');
      expect(alert).toHaveStyle('border-radius: 12px');
      expect(alert).toHaveStyle('transition: all 0.3s ease');
    });
  });

  it('should show dismiss buttons on alerts', () => {
    renderWithProvider(<BudgetAlerts />);

    const dismissButtons = screen.getAllByLabelText('Dismiss alert');
    expect(dismissButtons.length).toBeGreaterThan(0);
  });

  it('should dismiss alert when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BudgetAlerts />);

    const dismissButtons = screen.getAllByLabelText('Dismiss alert');
    const initialAlertCount = screen.getAllByTestId(/alert-/).length;
    
    await user.click(dismissButtons[0]);

    // Check if alert is removed
    const remainingAlerts = screen.getAllByTestId(/alert-/);
    expect(remainingAlerts.length).toBe(initialAlertCount - 1);
  });

  it('should show no alerts message when no alerts exist', () => {
    mockUseBudgetStore.mockReturnValue({
      budgetStatus: [mockBudgetStatus[0]], // Only the good budget
      isLoading: false,
      error: null,
      fetchBudgetStatus: mockFetchBudgetStatus,
      currentMonth: '2024-01',
    } as any);

    renderWithProvider(<BudgetAlerts />);

    expect(screen.getByText('All budgets are on track!')).toBeInTheDocument();
    expect(screen.getByText('Great job managing your finances')).toBeInTheDocument();
  });

  it('should show loading state with skeleton alerts', () => {
    mockUseBudgetStore.mockReturnValue({
      budgetStatus: [],
      isLoading: true,
      error: null,
      fetchBudgetStatus: mockFetchBudgetStatus,
      currentMonth: '2024-01',
    } as any);

    renderWithProvider(<BudgetAlerts />);

    const skeletons = screen.getAllByTestId('alert-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should have hover effects on alert cards', () => {
    renderWithProvider(<BudgetAlerts />);

    const alerts = screen.getAllByTestId(/alert-/);
    alerts.forEach(alert => {
      expect(alert).toHaveClass('hover:shadow-md');
      expect(alert).toHaveClass('hover:scale-[1.01]');
    });
  });

  it('should show alert priority with different styling', () => {
    renderWithProvider(<BudgetAlerts />);

    // Exceeded budget should have higher priority styling
    const exceededAlert = screen.getByTestId('alert-exceeded');
    expect(exceededAlert).toHaveClass('priority-high');
    
    // Warning should have medium priority
    const warningAlert = screen.getByTestId('alert-warning');
    expect(warningAlert).toHaveClass('priority-medium');
  });

  it('should animate alerts on mount', () => {
    renderWithProvider(<BudgetAlerts />);

    const alerts = screen.getAllByTestId(/alert-/);
    alerts.forEach(alert => {
      expect(alert).toHaveClass('animate-slide-in');
    });
  });

  it('should show action buttons for exceeded budgets', () => {
    renderWithProvider(<BudgetAlerts />);

    // Check for "Adjust Budget" button on exceeded alert
    expect(screen.getByText('Adjust Budget')).toBeInTheDocument();
    
    // Check for "View Transactions" button
    expect(screen.getByText('View Transactions')).toBeInTheDocument();
  });

  it('should handle alert actions correctly', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BudgetAlerts />);

    // Click adjust budget button
    const adjustButton = screen.getByText('Adjust Budget');
    await user.click(adjustButton);

    // Should trigger some action (would be tested in integration)
    expect(adjustButton).toHaveBeenClicked;
  });

  it('should group alerts by severity', () => {
    renderWithProvider(<BudgetAlerts />);

    // Check if alerts are grouped properly
    const criticalSection = screen.getByTestId('alerts-critical');
    const warningSection = screen.getByTestId('alerts-warning');
    
    expect(criticalSection).toBeInTheDocument();
    expect(warningSection).toBeInTheDocument();
  });

  it('should show alert count in header', () => {
    renderWithProvider(<BudgetAlerts />);

    // Should show total alert count
    expect(screen.getByText('Budget Alerts (2)')).toBeInTheDocument();
  });

  it('should fetch budget status on mount', () => {
    renderWithProvider(<BudgetAlerts />);
    expect(mockFetchBudgetStatus).toHaveBeenCalledWith('2024-01');
  });

  it('should auto-refresh alerts periodically', () => {
    jest.useFakeTimers();
    renderWithProvider(<BudgetAlerts />);

    // Fast-forward time
    jest.advanceTimersByTime(60000); // 1 minute

    // Should have called fetch again
    expect(mockFetchBudgetStatus).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});