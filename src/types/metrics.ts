// Types for dashboard metrics and KPIs

export interface MonthlyBalance {
  organization_id: string;
  month: string; // YYYY-MM-DD format
  income: number;
  expense: number;
  net_balance: number;
  transaction_count: number;
}

export interface TopExpenseCategory {
  category_id: string;
  category_name: string;
  category_color: string | null;
  total_amount: number;
  transaction_count: number;
  percentage: number;
}

export interface CurrentMonthKPIs {
  current_month_income: number;
  current_month_expense: number;
  current_month_balance: number;
  previous_month_income: number;
  previous_month_expense: number;
  previous_month_balance: number;
  income_change_pct: number;
  expense_change_pct: number;
  balance_change_pct: number;
}

export interface DashboardMetrics {
  kpis: CurrentMonthKPIs;
  monthlyBalance: MonthlyBalance[];
  topCategories: TopExpenseCategory[];
}

export interface MonthlyBalanceResponse {
  data: MonthlyBalance[];
  months: number;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface TopCategoriesResponse {
  data: TopExpenseCategory[];
  month?: string;
  startDate?: string;
  endDate?: string;
  totalExpenses: number;
  limit: number;
}

export interface KPIsResponse extends CurrentMonthKPIs {
  month?: string;
  startDate?: string;
  endDate?: string;
  currency: string;
  lastUpdated: string;
}

// Chart data types for frontend components
export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface MonthlyChartData {
  month: string;
  income: number;
  expense: number;
  balance: number;
}

export interface CategoryChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

// API response wrapper types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: any;
}

export interface MetricsApiResponse extends ApiResponse<DashboardMetrics> {}
export interface MonthlyApiResponse extends ApiResponse<MonthlyBalanceResponse> {}
export interface CategoriesApiResponse extends ApiResponse<TopCategoriesResponse> {}
export interface KPIsApiResponse extends ApiResponse<KPIsResponse> {}