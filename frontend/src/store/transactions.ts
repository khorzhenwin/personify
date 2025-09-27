import { create } from 'zustand';
import { 
  Transaction, 
  CreateTransactionData, 
  UpdateTransactionData, 
  TransactionFilters,
  PaginationState,
  Category
} from '@/types/transaction';
import { transactionApi, categoryApi } from '@/lib/api/transactions';

interface TransactionState {
  // Data
  transactions: Transaction[];
  categories: Category[];
  filters: TransactionFilters;
  pagination: PaginationState;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  fetchTransactions: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionData) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;
  exportTransactions: () => Promise<void>;
  
  // UI state
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (transaction: Transaction | null) => void;
}

const initialFilters: TransactionFilters = {
  search: '',
  category_id: '',
  transaction_type: '',
  date_from: '',
  date_to: '',
  amount_min: undefined,
  amount_max: undefined,
};

const initialPagination: PaginationState = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0,
};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  // Initial state
  transactions: [],
  categories: [],
  filters: initialFilters,
  pagination: initialPagination,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  error: null,
  selectedTransaction: null,

  // Fetch transactions with current filters and pagination
  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { filters, pagination } = get();
      const response = await transactionApi.getTransactions(filters, pagination.page, pagination.limit);
      
      set({
        transactions: response.results,
        pagination: {
          ...pagination,
          total: response.count,
          totalPages: Math.ceil(response.count / pagination.limit),
        },
        isLoading: false,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        isLoading: false 
      });
    }
  },

  // Fetch categories
  fetchCategories: async () => {
    try {
      const categories = await categoryApi.getCategories();
      set({ categories });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch categories' });
    }
  },

  // Create new transaction
  createTransaction: async (data: CreateTransactionData) => {
    set({ isCreating: true, error: null });
    try {
      const newTransaction = await transactionApi.createTransaction(data);
      const { transactions } = get();
      set({ 
        transactions: [newTransaction, ...transactions],
        isCreating: false 
      });
      // Refresh to get updated pagination
      get().fetchTransactions();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create transaction',
        isCreating: false 
      });
    }
  },

  // Update transaction
  updateTransaction: async (id: string, data: UpdateTransactionData) => {
    set({ isUpdating: true, error: null });
    try {
      const updatedTransaction = await transactionApi.updateTransaction(id, data);
      const { transactions } = get();
      set({
        transactions: transactions.map(t => t.id === id ? updatedTransaction : t),
        isUpdating: false,
        selectedTransaction: null,
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update transaction',
        isUpdating: false 
      });
    }
  },

  // Delete transaction
  deleteTransaction: async (id: string) => {
    set({ isDeleting: true, error: null });
    try {
      await transactionApi.deleteTransaction(id);
      const { transactions } = get();
      set({
        transactions: transactions.filter(t => t.id !== id),
        isDeleting: false,
        selectedTransaction: null,
      });
      // Refresh to get updated pagination
      get().fetchTransactions();
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete transaction',
        isDeleting: false 
      });
    }
  },

  // Set filters and reset to first page
  setFilters: (newFilters: Partial<TransactionFilters>) => {
    const { filters } = get();
    set({
      filters: { ...filters, ...newFilters },
      pagination: { ...get().pagination, page: 1 },
    });
    // Auto-fetch with new filters
    get().fetchTransactions();
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: initialFilters,
      pagination: { ...get().pagination, page: 1 },
    });
    get().fetchTransactions();
  },

  // Set page
  setPage: (page: number) => {
    set({
      pagination: { ...get().pagination, page },
    });
    get().fetchTransactions();
  },

  // Export transactions
  exportTransactions: async () => {
    try {
      const { filters } = get();
      const blob = await transactionApi.exportTransactions(filters);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to export transactions' });
    }
  },

  // Set selected transaction
  setSelectedTransaction: (transaction: Transaction | null) => {
    set({ selectedTransaction: transaction });
  },
}));