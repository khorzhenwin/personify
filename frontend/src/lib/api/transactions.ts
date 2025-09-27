import axios from 'axios';
import { 
  Transaction, 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionFilters,
  TransactionListResponse,
  Category
} from '@/types/transaction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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
    return response.data;
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
    return response.data;
  },

  // Create category
  createCategory: async (data: { name: string; description?: string; color: string }): Promise<Category> => {
    const response = await api.post('/api/categories/', data);
    return response.data;
  },
};