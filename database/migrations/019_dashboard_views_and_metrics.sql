-- Dashboard views and metrics for BudgetUp MiPymes
-- This migration creates views and functions for dashboard KPIs and metrics
-- Requirements: 8.1, 8.3

-- Create monthly balance view for dashboard charts (requirement 8.1)
CREATE OR REPLACE VIEW v_monthly_balance AS
SELECT 
  organization_id,
  DATE_TRUNC('month', occurred_at)::DATE as month,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance,
  COUNT(CASE WHEN type IN ('income', 'expense') THEN 1 END)::INTEGER as transaction_count
FROM transactions
WHERE type IN ('income', 'expense')
GROUP BY organization_id, DATE_TRUNC('month', occurred_at)
ORDER BY organization_id, month;

-- Create view for top expense categories (requirement 8.3)
CREATE OR REPLACE VIEW v_top_expense_categories AS
WITH monthly_totals AS (
  SELECT 
    t.organization_id,
    DATE_TRUNC('month', t.occurred_at)::DATE as month,
    t.category_id,
    c.name as category_name,
    c.color as category_color,
    SUM(t.amount) as total_amount,
    COUNT(t.id) as transaction_count
  FROM transactions t
  JOIN categories c ON t.category_id = c.id
  WHERE t.type = 'expense'
  GROUP BY t.organization_id, DATE_TRUNC('month', t.occurred_at), t.category_id, c.name, c.color
),
monthly_expense_totals AS (
  SELECT 
    organization_id,
    month,
    SUM(total_amount) as month_total_expenses
  FROM monthly_totals
  GROUP BY organization_id, month
)
SELECT 
  mt.organization_id,
  mt.month,
  mt.category_id,
  mt.category_name,
  mt.category_color,
  mt.total_amount,
  mt.transaction_count,
  CASE 
    WHEN met.month_total_expenses > 0 
    THEN ROUND((mt.total_amount / met.month_total_expenses * 100), 2)
    ELSE 0
  END as percentage
FROM monthly_totals mt
JOIN monthly_expense_totals met ON mt.organization_id = met.organization_id AND mt.month = met.month
ORDER BY mt.organization_id, mt.month, mt.total_amount DESC;

-- Function to get current month KPIs (requirement 8.1)
CREATE OR REPLACE FUNCTION get_current_month_kpis(p_organization_id UUID)
RETURNS TABLE(
  current_month_income NUMERIC(14,2),
  current_month_expense NUMERIC(14,2),
  current_month_balance NUMERIC(14,2),
  previous_month_income NUMERIC(14,2),
  previous_month_expense NUMERIC(14,2),
  previous_month_balance NUMERIC(14,2),
  income_change_pct NUMERIC(5,2),
  expense_change_pct NUMERIC(5,2),
  balance_change_pct NUMERIC(5,2)
) AS $
DECLARE
  current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  previous_month_start DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  previous_month_end DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  
  curr_income NUMERIC(14,2) := 0;
  curr_expense NUMERIC(14,2) := 0;
  curr_balance NUMERIC(14,2) := 0;
  prev_income NUMERIC(14,2) := 0;
  prev_expense NUMERIC(14,2) := 0;
  prev_balance NUMERIC(14,2) := 0;
BEGIN
  -- Get current month metrics
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
  INTO curr_income, curr_expense, curr_balance
  FROM transactions
  WHERE organization_id = p_organization_id
  AND type IN ('income', 'expense')
  AND occurred_at >= current_month_start
  AND occurred_at <= CURRENT_DATE;
  
  -- Get previous month metrics
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0)
  INTO prev_income, prev_expense, prev_balance
  FROM transactions
  WHERE organization_id = p_organization_id
  AND type IN ('income', 'expense')
  AND occurred_at >= previous_month_start
  AND occurred_at <= previous_month_end;
  
  -- Return results with percentage changes
  RETURN QUERY SELECT
    curr_income as current_month_income,
    curr_expense as current_month_expense,
    curr_balance as current_month_balance,
    prev_income as previous_month_income,
    prev_expense as previous_month_expense,
    prev_balance as previous_month_balance,
    CASE 
      WHEN prev_income > 0 THEN ROUND(((curr_income - prev_income) / prev_income * 100), 2)
      WHEN curr_income > 0 THEN 100.00
      ELSE 0.00
    END as income_change_pct,
    CASE 
      WHEN prev_expense > 0 THEN ROUND(((curr_expense - prev_expense) / prev_expense * 100), 2)
      WHEN curr_expense > 0 THEN 100.00
      ELSE 0.00
    END as expense_change_pct,
    CASE 
      WHEN prev_balance != 0 THEN ROUND(((curr_balance - prev_balance) / ABS(prev_balance) * 100), 2)
      WHEN curr_balance > 0 THEN 100.00
      WHEN curr_balance < 0 THEN -100.00
      ELSE 0.00
    END as balance_change_pct;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get last 12 months balance for charts (requirement 8.1)
CREATE OR REPLACE FUNCTION get_last_12_months_balance(p_organization_id UUID)
RETURNS TABLE(
  month DATE,
  income NUMERIC(14,2),
  expense NUMERIC(14,2),
  net_balance NUMERIC(14,2),
  cumulative_balance NUMERIC(14,2)
) AS $
BEGIN
  RETURN QUERY
  WITH monthly_data AS (
    SELECT 
      mb.month,
      mb.income,
      mb.expense,
      mb.net_balance
    FROM v_monthly_balance mb
    WHERE mb.organization_id = p_organization_id
    AND mb.month >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')::DATE
    AND mb.month <= DATE_TRUNC('month', CURRENT_DATE)::DATE
  ),
  all_months AS (
    SELECT generate_series(
      (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months')::DATE,
      DATE_TRUNC('month', CURRENT_DATE)::DATE,
      '1 month'::INTERVAL
    )::DATE as month
  )
  SELECT 
    am.month,
    COALESCE(md.income, 0) as income,
    COALESCE(md.expense, 0) as expense,
    COALESCE(md.net_balance, 0) as net_balance,
    SUM(COALESCE(md.net_balance, 0)) OVER (ORDER BY am.month) as cumulative_balance
  FROM all_months am
  LEFT JOIN monthly_data md ON am.month = md.month
  ORDER BY am.month;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top expense categories for current month (requirement 8.3)
CREATE OR REPLACE FUNCTION get_current_month_top_categories(
  p_organization_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
  category_id UUID,
  category_name VARCHAR(255),
  category_color VARCHAR(7),
  total_amount NUMERIC(14,2),
  transaction_count INTEGER,
  percentage NUMERIC(5,2)
) AS $
DECLARE
  current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
  RETURN QUERY
  SELECT 
    vtec.category_id,
    vtec.category_name,
    vtec.category_color,
    vtec.total_amount,
    vtec.transaction_count::INTEGER,
    vtec.percentage
  FROM v_top_expense_categories vtec
  WHERE vtec.organization_id = p_organization_id
  AND vtec.month = current_month_start
  ORDER BY vtec.total_amount DESC
  LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create additional indexes for dashboard performance optimization
CREATE INDEX IF NOT EXISTS idx_transactions_org_month_type ON transactions(organization_id, DATE_TRUNC('month', occurred_at), type);
CREATE INDEX IF NOT EXISTS idx_transactions_current_month ON transactions(organization_id, occurred_at) 
  WHERE occurred_at >= DATE_TRUNC('month', CURRENT_DATE);
CREATE INDEX IF NOT EXISTS idx_transactions_last_12_months ON transactions(organization_id, occurred_at)
  WHERE occurred_at >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '11 months');

-- Create partial index for expense transactions with categories
CREATE INDEX IF NOT EXISTS idx_transactions_expense_category ON transactions(organization_id, category_id, occurred_at, amount)
  WHERE type = 'expense';

-- Create index for income transactions
CREATE INDEX IF NOT EXISTS idx_transactions_income ON transactions(organization_id, occurred_at, amount)
  WHERE type = 'income';

-- Grant permissions for views and functions
GRANT SELECT ON v_monthly_balance TO authenticated;
GRANT SELECT ON v_top_expense_categories TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_month_kpis(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_last_12_months_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_month_top_categories(UUID, INTEGER) TO authenticated;

-- Add RLS policies for the views
CREATE POLICY "Users can view monthly balance in their organizations" ON v_monthly_balance
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Users can view top expense categories in their organizations" ON v_top_expense_categories
  FOR SELECT USING (is_member(organization_id));

-- Add documentation comments
COMMENT ON VIEW v_monthly_balance IS 'Monthly income, expense and net balance aggregated by organization and month for dashboard charts';
COMMENT ON VIEW v_top_expense_categories IS 'Top expense categories by month with amounts and percentages for dashboard analytics';
COMMENT ON FUNCTION get_current_month_kpis(UUID) IS 'Returns current month KPIs with comparison to previous month for dashboard metrics';
COMMENT ON FUNCTION get_last_12_months_balance(UUID) IS 'Returns last 12 months balance data for dashboard line charts';
COMMENT ON FUNCTION get_current_month_top_categories(UUID, INTEGER) IS 'Returns top expense categories for current month for dashboard donut charts';

-- Create materialized view for better performance on large datasets (optional optimization)
-- This can be refreshed periodically for better dashboard performance
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_monthly_metrics AS
SELECT 
  organization_id,
  month,
  income,
  expense,
  net_balance,
  transaction_count,
  LAG(net_balance) OVER (PARTITION BY organization_id ORDER BY month) as previous_month_balance,
  LAG(income) OVER (PARTITION BY organization_id ORDER BY month) as previous_month_income,
  LAG(expense) OVER (PARTITION BY organization_id ORDER BY month) as previous_month_expense
FROM v_monthly_balance
WHERE month >= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '24 months')::DATE;

-- Create unique index on materialized view for better performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_monthly_metrics_org_month ON mv_monthly_metrics(organization_id, month);

-- Grant permissions for materialized view
GRANT SELECT ON mv_monthly_metrics TO authenticated;

-- Add RLS policy for materialized view
CREATE POLICY "Users can view monthly metrics in their organizations" ON mv_monthly_metrics
  FOR SELECT USING (is_member(organization_id));

-- Function to refresh materialized view (can be called by cron job or API)
CREATE OR REPLACE FUNCTION refresh_monthly_metrics()
RETURNS VOID AS $
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_metrics;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION refresh_monthly_metrics() IS 'Refreshes the materialized view for monthly metrics - should be called periodically';
COMMENT ON MATERIALIZED VIEW mv_monthly_metrics IS 'Materialized view of monthly metrics for improved dashboard performance';