import { create } from 'zustand';
import { 
  Budget, 
  BudgetStatus, 
  BudgetOverview,
  CreateBudgetData, 
  UpdateBudgetData,
  CategoryWithBudget
} from '@/types/budget';
import { Category } from '@/types/transaction';
import { budgetApi, categoryApi } from '@/lib/api/budgets';
import { notifications } from '@mantine/notifications';

interface BudgetState {
  // State
  budgets: Budget[];
  budgetStatus: BudgetStatus[];
  budgetOverview: BudgetOverview | null;
  categories: Category[];
  categoriesWithBudgets: CategoryWithBudget[];
  currentMonth: string;
  isLoading: boolean;
  error: string | null;
  lastNotificationTime: number;

  // Actions
  setBudgets: (budgets: Budget[]) => void;
  setBudgetStatus: (status: BudgetStatus[]) => void;
  setBudgetOverview: (overview: BudgetOverview) => void;
  setCategories: (categories: Category[]) => void;
  setCategoriesWithBudgets: (categories: CategoryWithBudget[]) => void;
  setCurrentMonth: (month: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API Actions
  fetchBudgetOverview: (month?: string) => Promise<void>;
  fetchBudgets: (month?: string) => Promise<void>;
  fetchBudgetStatus: (month?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCategoriesWithBudgets: (month?: string) => Promise<void>;
  createBudget: (data: CreateBudgetData) => Promise<Budget | null>;
  updateBudget: (id: string, data: UpdateBudgetData) => Promise<Budget | null>;
  deleteBudget: (id: string) => Promise<boolean>;
  createCategory: (data: { name: string; description?: string; color: string }) => Promise<Category | null>;
  updateCategory: (id: string, data: { name?: string; description?: string; color?: string }) => Promise<Category | null>;
  deleteCategory: (id: string) => Promise<boolean>;
}

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

// Helper function to show notifications with deduplication (max 1 per 5 seconds)
const showNotificationWithDeduplication = (get: any, set: any, title: string, message: string, color: string) => {
  const now = Date.now();
  const { lastNotificationTime } = get();
  
  // Only show notification if more than 5 seconds have passed since the last one
  if (now - lastNotificationTime > 5000) {
    notifications.show({
      title,
      message,
      color,
    });
    set({ lastNotificationTime: now });
  }
};

export const useBudgetStore = create<BudgetState>((set, get) => ({
  // Initial state
  budgets: [],
  budgetStatus: [],
  budgetOverview: null,
  categories: [],
  categoriesWithBudgets: [],
  currentMonth: getCurrentMonth(),
  isLoading: false,
  error: null,
  lastNotificationTime: 0,

  // State setters
  setBudgets: (budgets) => set({ budgets }),
  setBudgetStatus: (budgetStatus) => set({ budgetStatus }),
  setBudgetOverview: (budgetOverview) => set({ budgetOverview }),
  setCategories: (categories) => set({ categories }),
  setCategoriesWithBudgets: (categoriesWithBudgets) => set({ categoriesWithBudgets }),
  setCurrentMonth: (currentMonth) => set({ currentMonth }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // API Actions
  fetchBudgetOverview: async (month) => {
    const { setLoading, setError, setBudgetOverview } = get();
    setLoading(true);
    setError(null);

    try {
      const overview = await budgetApi.getBudgetOverview(month);
      setBudgetOverview(overview);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to load budgets';
      setError(errorMessage);
      showNotificationWithDeduplication(get, set, 'Error', errorMessage, 'red');
    } finally {
      setLoading(false);
    }
  },

  fetchBudgets: async (month) => {
    const { setLoading, setError, setBudgets } = get();
    setLoading(true);
    setError(null);

    try {
      const budgets = await budgetApi.getBudgets(month);
      setBudgets(budgets);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch budgets';
      setError(errorMessage);
      showNotificationWithDeduplication(get, set, 'Error', errorMessage, 'red');
    } finally {
      setLoading(false);
    }
  },

  fetchBudgetStatus: async (month) => {
    const { setLoading, setError, setBudgetStatus } = get();
    setLoading(true);
    setError(null);

    try {
      const status = await budgetApi.getBudgetStatus(month);
      setBudgetStatus(status);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch budget status';
      setError(errorMessage);
      showNotificationWithDeduplication(get, set, 'Error', errorMessage, 'red');
    } finally {
      setLoading(false);
    }
  },

  fetchCategories: async () => {
    const { setLoading, setError, setCategories } = get();
    setLoading(true);
    setError(null);

    try {
      const categories = await categoryApi.getCategories();
      setCategories(categories);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch categories';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  },

  fetchCategoriesWithBudgets: async (month) => {
    const { setLoading, setError, setCategoriesWithBudgets } = get();
    setLoading(true);
    setError(null);

    try {
      const categories = await categoryApi.getCategoriesWithBudgets(month);
      setCategoriesWithBudgets(categories);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch categories with budgets';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  },

  createBudget: async (data) => {
    const { setLoading, setError, fetchBudgetOverview, fetchBudgetStatus, currentMonth } = get();
    setLoading(true);
    setError(null);

    try {
      const budget = await budgetApi.createBudget(data);
      notifications.show({
        title: 'Success',
        message: 'Budget created successfully',
        color: 'green',
      });
      
      // Refresh data
      await fetchBudgetOverview(currentMonth);
      await fetchBudgetStatus(currentMonth);
      
      return budget;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create budget';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  },

  updateBudget: async (id, data) => {
    const { setLoading, setError, fetchBudgetOverview, fetchBudgetStatus, currentMonth } = get();
    setLoading(true);
    setError(null);

    try {
      const budget = await budgetApi.updateBudget(id, data);
      notifications.show({
        title: 'Success',
        message: 'Budget updated successfully',
        color: 'green',
      });
      
      // Refresh data
      await fetchBudgetOverview(currentMonth);
      await fetchBudgetStatus(currentMonth);
      
      return budget;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update budget';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  },

  deleteBudget: async (id) => {
    const { setLoading, setError, fetchBudgetOverview, fetchBudgetStatus, currentMonth } = get();
    setLoading(true);
    setError(null);

    try {
      await budgetApi.deleteBudget(id);
      notifications.show({
        title: 'Success',
        message: 'Budget deleted successfully',
        color: 'green',
      });
      
      // Refresh data
      await fetchBudgetOverview(currentMonth);
      await fetchBudgetStatus(currentMonth);
      
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete budget';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  },

  createCategory: async (data) => {
    const { setLoading, setError, fetchCategories } = get();
    setLoading(true);
    setError(null);

    try {
      const category = await categoryApi.createCategory(data);
      notifications.show({
        title: 'Success',
        message: 'Category created successfully',
        color: 'green',
      });
      
      // Refresh categories
      await fetchCategories();
      
      return category;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create category';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  },

  updateCategory: async (id, data) => {
    const { setLoading, setError, fetchCategories } = get();
    setLoading(true);
    setError(null);

    try {
      const category = await categoryApi.updateCategory(id, data);
      notifications.show({
        title: 'Success',
        message: 'Category updated successfully',
        color: 'green',
      });
      
      // Refresh categories
      await fetchCategories();
      
      return category;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update category';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return null;
    } finally {
      setLoading(false);
    }
  },

  deleteCategory: async (id) => {
    const { setLoading, setError, fetchCategories } = get();
    setLoading(true);
    setError(null);

    try {
      await categoryApi.deleteCategory(id);
      notifications.show({
        title: 'Success',
        message: 'Category deleted successfully',
        color: 'green',
      });
      
      // Refresh categories
      await fetchCategories();
      
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete category';
      setError(errorMessage);
      notifications.show({
        title: 'Error',
        message: errorMessage,
        color: 'red',
      });
      return false;
    } finally {
      setLoading(false);
    }
  },
}));