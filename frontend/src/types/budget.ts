export interface Budget {
  id: string;
  category: {
    id: string;
    name: string;
    color: string;
    description?: string;
  };
  amount: number;
  month: string; // YYYY-MM format
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  remaining: number;
  percentage: number;
  is_exceeded: boolean;
}

export interface CreateBudgetData {
  category_id: string;
  amount: number;
  month: string; // YYYY-MM format
}

export interface UpdateBudgetData extends Partial<CreateBudgetData> {
  id?: string;
}

export interface BudgetOverview {
  total_budgeted: number;
  total_spent: number;
  total_remaining: number;
  budgets: BudgetStatus[];
  month: string;
}

export interface CategoryWithBudget {
  id: string;
  name: string;
  description?: string;
  color: string;
  current_budget?: Budget;
  total_spent: number;
  transaction_count: number;
}