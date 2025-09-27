import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { BudgetOverview, BudgetForm, CategoryManager, BudgetAlerts } from '../index';
import { theme } from '@/theme';

// Mock the budget store
jest.mock('@/store/budgets', () => ({
  useBudgetStore: () => ({
    budgetOverview: null,
    budgetStatus: [],
    categories: [],
    isLoading: false,
    error: null,
    fetchBudgetOverview: jest.fn(),
    fetchBudgetStatus: jest.fn(),
    fetchCategories: jest.fn(),
    currentMonth: '2024-01',
    setCurrentMonth: jest.fn(),
    createBudget: jest.fn(),
    updateBudget: jest.fn(),
    deleteBudget: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  }),
}));

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {component}
    </MantineProvider>
  );
};

describe('Budget Components Integration', () => {
  it('should render BudgetOverview without crashing', () => {
    expect(() => {
      renderWithProvider(<BudgetOverview />);
    }).not.toThrow();
  });

  it('should render CategoryManager without crashing', () => {
    expect(() => {
      renderWithProvider(<CategoryManager />);
    }).not.toThrow();
  });

  it('should render BudgetAlerts without crashing', () => {
    expect(() => {
      renderWithProvider(<BudgetAlerts />);
    }).not.toThrow();
  });

  it('should render BudgetForm without crashing', () => {
    expect(() => {
      renderWithProvider(
        <BudgetForm
          opened={true}
          onClose={() => {}}
          month="2024-01"
        />
      );
    }).not.toThrow();
  });

  it('should have all components exported from index', () => {
    expect(BudgetOverview).toBeDefined();
    expect(BudgetForm).toBeDefined();
    expect(CategoryManager).toBeDefined();
    expect(BudgetAlerts).toBeDefined();
  });
});