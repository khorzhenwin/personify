import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SpendingByCategory {
  category: string;
  amount: number;
  color: string;
  percentage: number;
}

export interface SpendingTrend {
  date: string;
  amount: number;
  type: 'income' | 'expense';
}

export interface BudgetPerformance {
  category: string;
  budgeted: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'under' | 'over' | 'on-track';
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  top_categories: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
}

export interface AnalyticsData {
  spending_by_category: SpendingByCategory[];
  spending_trends: SpendingTrend[];
  budget_performance: BudgetPerformance[];
  monthly_summary: MonthlySummary;
}

// Mock data for development - replace with real API calls
export const analyticsApi = {
  getSpendingByCategory: async (dateRange?: { start: string; end: string }): Promise<SpendingByCategory[]> => {
    // Mock data with modern color palette
    return [
      { category: 'Food & Dining', amount: 850, color: '#FF6B6B', percentage: 35 },
      { category: 'Transportation', amount: 420, color: '#4ECDC4', percentage: 17 },
      { category: 'Shopping', amount: 380, color: '#45B7D1', percentage: 16 },
      { category: 'Entertainment', amount: 290, color: '#96CEB4', percentage: 12 },
      { category: 'Utilities', amount: 250, color: '#FFEAA7', percentage: 10 },
      { category: 'Healthcare', amount: 150, color: '#DDA0DD', percentage: 6 },
      { category: 'Other', amount: 100, color: '#98D8C8', percentage: 4 },
    ];
  },

  getSpendingTrends: async (dateRange?: { start: string; end: string }): Promise<SpendingTrend[]> => {
    // Mock data for the last 30 days
    const trends: SpendingTrend[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        amount: Math.random() * 200 + 50,
        type: 'expense'
      });
      
      // Add some income data
      if (i % 7 === 0) {
        trends.push({
          date: date.toISOString().split('T')[0],
          amount: Math.random() * 500 + 1000,
          type: 'income'
        });
      }
    }
    
    return trends;
  },

  getBudgetPerformance: async (month?: string): Promise<BudgetPerformance[]> => {
    return [
      { category: 'Food & Dining', budgeted: 1000, spent: 850, remaining: 150, percentage: 85, status: 'under' },
      { category: 'Transportation', budgeted: 400, spent: 420, remaining: -20, percentage: 105, status: 'over' },
      { category: 'Shopping', budgeted: 500, spent: 380, remaining: 120, percentage: 76, status: 'under' },
      { category: 'Entertainment', budgeted: 300, spent: 290, remaining: 10, percentage: 97, status: 'on-track' },
      { category: 'Utilities', budgeted: 250, spent: 250, remaining: 0, percentage: 100, status: 'on-track' },
    ];
  },

  getMonthlySummary: async (month?: string): Promise<MonthlySummary> => {
    return {
      month: month || new Date().toISOString().slice(0, 7),
      total_income: 4500,
      total_expenses: 2340,
      net_amount: 2160,
      transaction_count: 47,
      top_categories: [
        { category: 'Food & Dining', amount: 850, count: 15 },
        { category: 'Transportation', amount: 420, count: 8 },
        { category: 'Shopping', amount: 380, count: 6 },
      ]
    };
  },

  getAnalyticsData: async (dateRange?: { start: string; end: string }): Promise<AnalyticsData> => {
    const [spendingByCategory, spendingTrends, budgetPerformance, monthlySummary] = await Promise.all([
      analyticsApi.getSpendingByCategory(dateRange),
      analyticsApi.getSpendingTrends(dateRange),
      analyticsApi.getBudgetPerformance(),
      analyticsApi.getMonthlySummary(),
    ]);

    return {
      spending_by_category: spendingByCategory,
      spending_trends: spendingTrends,
      budget_performance: budgetPerformance,
      monthly_summary: monthlySummary,
    };
  },
};