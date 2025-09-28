import { 
  Transaction, 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionFilters,
  TransactionListResponse,
  Category
} from '@/types/transaction';
import { apiClient as api } from './client';

export const transactionApi = {
  // Get transactions with filters and pagination
  getTransactions: async (filters: TransactionFilters = {}, page = 1, limit = 20): Promise<TransactionListResponse> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id) params.append('category', filters.category_id);
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.amount_min !== undefined) params.append('amount_min', filters.amount_min.toString());
    if (filters.amount_max !== undefined) params.append('amount_max', filters.amount_max.toString());
    
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/api/transactions/?${params.toString()}`);
    const data = response.data;
    
    // Ensure we return a proper TransactionListResponse structure
    return {
      results: Array.isArray(data?.results) ? data.results : [],
      count: data?.count || 0,
      next: data?.next || null,
      previous: data?.previous || null,
    };
  },

  // Get single transaction
  getTransaction: async (id: string): Promise<Transaction> => {
    const response = await api.get(`/api/transactions/${id}/`);
    return response.data;
  },

  // Create transaction
  createTransaction: async (data: CreateTransactionData): Promise<Transaction> => {
    const response = await api.post('/api/transactions/', data);
    return response.data;
  },

  // Update transaction
  updateTransaction: async (id: string, data: UpdateTransactionData): Promise<Transaction> => {
    const response = await api.put(`/api/transactions/${id}/`, data);
    return response.data;
  },

  // Delete transaction
  deleteTransaction: async (id: string): Promise<void> => {
    await api.delete(`/api/transactions/${id}/`);
  },

  // Export transactions
  exportTransactions: async (filters: TransactionFilters = {}): Promise<Blob> => {
    const params = new URLSearchParams();
    
    if (filters.search) params.append('search', filters.search);
    if (filters.category_id) params.append('category', filters.category_id);
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);

    const response = await api.get(`/api/transactions/export/?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export const categoryApi = {
  // Get categories
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
};