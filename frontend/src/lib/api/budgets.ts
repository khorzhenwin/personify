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
    const response = await api.get(`/api/budgets/monthly_summary/${params}`);
    const data = response.data;
    
    // Transform backend budget_details to frontend budgets format
    interface BackendBudgetDetail {
      budget_id: number;
      category_id: number;
      category_name: string;
      category_color: string;
      budget_amount: number;
      spent_amount: number;
      remaining_amount: number;
      percentage_used: number;
      status: string;
      month: string;
    }
    
    const budgets = (data.budget_details || []).map((detail: BackendBudgetDetail) => ({
      budget: {
        id: String(detail.budget_id),
        category: {
          id: String(detail.category_id),
          name: detail.category_name,
          color: detail.category_color,
        },
        amount: detail.budget_amount,
        month: detail.month,
        created_at: '',
        updated_at: '',
      },
      spent: detail.spent_amount,
      remaining: detail.remaining_amount,
      percentage: detail.percentage_used,
      is_exceeded: detail.status === 'over_budget',
    }));
    
    return {
      total_budgeted: data.total_budgeted,
      total_spent: data.total_spent,
      total_remaining: data.total_remaining,
      budgets: budgets,
      month: data.month,
    };
  },

  // Get all budgets
  getBudgets: async (month?: string): Promise<Budget[]> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/budgets/${params}`);
    const data = response.data;
    
    // Ensure we always return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.results)) {
      return data.results;
    } else {
      console.warn('Budgets API returned unexpected format:', data);
      return [];
    }
  },

  // Get budget status for a specific month
  getBudgetStatus: async (month?: string): Promise<BudgetStatus[]> => {
    const params = month ? `?month=${month}` : '';
    const response = await api.get(`/api/budgets/status/${params}`);
    const data = response.data;
    
    // Ensure we always return an array
    if (Array.isArray(data)) {
      return data;
    } else if (data && Array.isArray(data.results)) {
      return data.results;
    } else {
      console.warn('Budget status API returned unexpected format:', data);
      return [];
    }
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
    // Handle both paginated and non-paginated responses
    const data = response.data;
    if (data && Array.isArray(data.results)) {
      return data.results;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.warn('Categories API returned unexpected format:', data);
      return [];
    }
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