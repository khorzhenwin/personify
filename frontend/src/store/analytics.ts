import { create } from 'zustand';
import { 
  analyticsApi, 
  AnalyticsData, 
  SpendingByCategory, 
  SpendingTrend, 
  BudgetPerformance, 
  MonthlySummary 
} from '@/lib/api/analytics';

interface DateRange {
  start: string;
  end: string;
}

interface AnalyticsState {
  // Data
  spendingByCategory: SpendingByCategory[];
  spendingTrends: SpendingTrend[];
  budgetPerformance: BudgetPerformance[];
  monthlySummary: MonthlySummary | null;
  analyticsData: AnalyticsData | null;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  selectedDateRange: DateRange | null;
  selectedCategory: string | null;
  
  // Actions
  fetchSpendingByCategory: (dateRange?: DateRange) => Promise<void>;
  fetchSpendingTrends: (dateRange?: DateRange) => Promise<void>;
  fetchBudgetPerformance: (month?: string) => Promise<void>;
  fetchMonthlySummary: (month?: string) => Promise<void>;
  fetchAnalyticsData: (dateRange?: DateRange) => Promise<void>;
  setSelectedDateRange: (dateRange: DateRange | null) => void;
  setSelectedCategory: (category: string | null) => void;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  spendingByCategory: [],
  spendingTrends: [],
  budgetPerformance: [],
  monthlySummary: null,
  analyticsData: null,
  isLoading: false,
  error: null,
  selectedDateRange: null,
  selectedCategory: null,

  // Actions
  fetchSpendingByCategory: async (dateRange) => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getSpendingByCategory(dateRange);
      set({ spendingByCategory: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch spending data',
        isLoading: false 
      });
    }
  },

  fetchSpendingTrends: async (dateRange) => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getSpendingTrends(dateRange);
      set({ spendingTrends: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch trend data',
        isLoading: false 
      });
    }
  },

  fetchBudgetPerformance: async (month) => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getBudgetPerformance(month);
      set({ budgetPerformance: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch budget performance',
        isLoading: false 
      });
    }
  },

  fetchMonthlySummary: async (month) => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getMonthlySummary(month);
      set({ monthlySummary: data, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch monthly summary',
        isLoading: false 
      });
    }
  },

  fetchAnalyticsData: async (dateRange) => {
    set({ isLoading: true, error: null });
    try {
      const data = await analyticsApi.getAnalyticsData(dateRange);
      set({ 
        analyticsData: data,
        spendingByCategory: data.spending_by_category,
        spendingTrends: data.spending_trends,
        budgetPerformance: data.budget_performance,
        monthlySummary: data.monthly_summary,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics data',
        isLoading: false 
      });
    }
  },

  setSelectedDateRange: (dateRange) => {
    set({ selectedDateRange: dateRange });
    // Automatically refetch data when date range changes
    if (dateRange) {
      get().fetchAnalyticsData(dateRange);
    }
  },

  setSelectedCategory: (category) => {
    set({ selectedCategory: category });
  },

  clearError: () => {
    set({ error: null });
  },
}));