import { 
  Budget, 
  BudgetStatus, 
  BudgetOverview,
  CreateBudgetData, 
  UpdateBudgetData,
  CategoryWithBudget
} from '@/types/budget';
import { Category } from '@/types/transaction';
import { apiClient as api } from './client';

export const budgetApi = {
  // Get budget overview for a specific month
  getBudgetOverview: async (month?: string): Promise<BudgetOverview> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/budgets/overview/${params}`);
    return response.data;
  },

  // Get all budgets
  getBudgets: async (month?: string): Promise<Budget[]> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/budgets/${params}`);
    return response.data;
  },

  // Get budget status for a specific month
  getBudgetStatus: async (month?: string): Promise<BudgetStatus[]> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/budgets/status/${params}`);
    return response.data;
  },

  // Create budget
  createBudget: async (data: CreateBudgetData): Promise<Budget> => {
    const response = await api.post('/api/budgets/', data);
    return response.data;
  },

  // Update budget
  updateBudget: async (id: string, data: UpdateBudgetData): Promise<Budget> => {
    const response = await api.put(`/api/budgets/${id}/`, data);
    return response.data;
  },

  // Delete budget
  deleteBudget: async (id: string): Promise<void> => {
    await api.delete(`/api/budgets/${id}/`);
  },
};

export const categoryApi = {
  // Get categories with budget information
  getCategoriesWithBudgets: async (month?: string): Promise<CategoryWithBudget[]> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/categories/with-budgets/${params}`);
    return response.data;
  },

  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/api/categories/');
    return response.data;
  },

  // Create category
  createCategory: async (data: { name: string; description?: string; color: string }): Promise<Category> => {
    const response = await api.post('/api/categories/', data);
    return response.data;
  },

  // Update category
  updateCategory: async (id: string, data: { name?: string; description?: string; color?: string }): Promise<Category> => {
    const response = await api.put(`/api/categories/${id}/`, data);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/api/categories/${id}/`);
  },
};