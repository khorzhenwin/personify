export interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: Category | null;
  transaction_type: 'income' | 'expense';
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface CreateTransactionData {
  amount: number;
  description: string;
  category_id?: string;
  transaction_type: 'income' | 'expense';
  date: string;
}

export interface UpdateTransactionData extends Partial<CreateTransactionData> {
  id?: string;
}

export interface TransactionFilters {
  search?: string;
  category_id?: string;
  transaction_type?: 'income' | 'expense' | '';
  date_from?: string;
  date_to?: string;
  amount_min?: number;
  amount_max?: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  results: Transaction[];
  count: number;
  next: string | null;
  previous: string | null;
}