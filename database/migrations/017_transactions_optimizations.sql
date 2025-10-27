-- Additional optimizations for transactions table
-- This migration adds performance optimizations and ensures all requirements are met
-- Requirements: 7.1, 7.2, 7.3

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON transactions(organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_org_account ON transactions(organization_id, account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_category ON transactions(organization_id, category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_type ON transactions(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON transactions(created_by);

-- Partial indexes for specific transaction types
CREATE INDEX IF NOT EXISTS idx_transactions_transfers ON transactions(organization_id, account_id, transfer_to_account_id) 
  WHERE type = 'transfer';

-- Index for attachment cleanup queries
CREATE INDEX IF NOT EXISTS idx_transactions_attachment_url ON transactions(attachment_url) 
  WHERE attachment_url IS NOT NULL;

-- Add updated_at trigger for transactions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get account balance at a specific date
CREATE OR REPLACE FUNCTION get_account_balance_at_date(
  p_account_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS NUMERIC AS $
DECLARE
  balance NUMERIC(14,2) := 0;
  initial_balance NUMERIC(14,2) := 0;
BEGIN
  -- Get initial balance
  SELECT COALESCE(a.initial_balance, 0) INTO initial_balance
  FROM accounts a
  WHERE a.id = p_account_id;
  
  -- Calculate balance from transactions up to the specified date
  SELECT COALESCE(SUM(
    CASE 
      WHEN t.type = 'income' THEN t.amount
      WHEN t.type = 'expense' THEN -t.amount
      WHEN t.type = 'transfer' AND t.account_id = p_account_id THEN -t.amount
      WHEN t.type = 'transfer' AND t.transfer_to_account_id = p_account_id THEN t.amount
      ELSE 0
    END
  ), 0) INTO balance
  FROM transactions t
  WHERE (t.account_id = p_account_id OR t.transfer_to_account_id = p_account_id)
  AND t.occurred_at <= p_date;
  
  RETURN initial_balance + balance;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly balance summary
CREATE OR REPLACE FUNCTION get_monthly_balance_summary(
  p_organization_id UUID,
  p_start_date DATE DEFAULT DATE_TRUNC('year', CURRENT_DATE)::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  month DATE,
  income NUMERIC(14,2),
  expense NUMERIC(14,2),
  net_balance NUMERIC(14,2),
  transaction_count INTEGER
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', t.occurred_at)::DATE as month,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_balance,
    COUNT(*)::INTEGER as transaction_count
  FROM transactions t
  WHERE t.organization_id = p_organization_id
  AND t.type IN ('income', 'expense')
  AND t.occurred_at >= p_start_date
  AND t.occurred_at <= p_end_date
  GROUP BY DATE_TRUNC('month', t.occurred_at)
  ORDER BY month;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top expense categories
CREATE OR REPLACE FUNCTION get_top_expense_categories(
  p_organization_id UUID,
  p_start_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  category_id UUID,
  category_name VARCHAR(255),
  total_amount NUMERIC(14,2),
  transaction_count INTEGER,
  percentage NUMERIC(5,2)
) AS $
DECLARE
  total_expenses NUMERIC(14,2);
BEGIN
  -- Get total expenses for percentage calculation
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM transactions t
  WHERE t.organization_id = p_organization_id
  AND t.type = 'expense'
  AND t.occurred_at >= p_start_date
  AND t.occurred_at <= p_end_date;
  
  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    COALESCE(SUM(t.amount), 0) as total_amount,
    COUNT(t.id)::INTEGER as transaction_count,
    CASE 
      WHEN total_expenses > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / total_expenses * 100), 2)
      ELSE 0
    END as percentage
  FROM categories c
  LEFT JOIN transactions t ON c.id = t.category_id 
    AND t.organization_id = p_organization_id
    AND t.type = 'expense'
    AND t.occurred_at >= p_start_date
    AND t.occurred_at <= p_end_date
  WHERE c.organization_id = p_organization_id
  AND c.type = 'expense'
  GROUP BY c.id, c.name
  HAVING COALESCE(SUM(t.amount), 0) > 0
  ORDER BY total_amount DESC
  LIMIT p_limit;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for current account balances (updated to use the function)
CREATE OR REPLACE VIEW v_account_balances AS
SELECT 
  a.id,
  a.organization_id,
  a.name,
  a.type,
  a.currency,
  a.initial_balance,
  get_account_balance_at_date(a.id, CURRENT_DATE) as current_balance,
  a.created_at,
  a.updated_at
FROM accounts a;

-- Grant permissions for the view
GRANT SELECT ON v_account_balances TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view account balances in their organizations" ON v_account_balances
  FOR SELECT USING (is_member(organization_id));

-- Add comments for documentation
COMMENT ON FUNCTION get_account_balance_at_date(UUID, DATE) IS 'Calculates account balance at a specific date including all transactions';
COMMENT ON FUNCTION get_monthly_balance_summary(UUID, DATE, DATE) IS 'Returns monthly income/expense summary for dashboard metrics';
COMMENT ON FUNCTION get_top_expense_categories(UUID, DATE, DATE, INTEGER) IS 'Returns top expense categories with amounts and percentages';
COMMENT ON VIEW v_account_balances IS 'Real-time view of account balances including transaction effects';

-- Ensure all necessary permissions are granted
GRANT EXECUTE ON FUNCTION get_account_balance_at_date(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_balance_summary(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_expense_categories(UUID, DATE, DATE, INTEGER) TO authenticated;