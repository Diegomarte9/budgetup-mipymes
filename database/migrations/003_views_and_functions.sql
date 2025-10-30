-- Database Views and Functions for BudgetUp MiPymes
-- This migration creates views for reporting and helper functions

-- View for monthly balance calculations
CREATE OR REPLACE VIEW v_monthly_balance AS
SELECT 
  organization_id,
  DATE_TRUNC('month', occurred_at) as month,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
  SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_balance
FROM transactions
WHERE type IN ('income', 'expense')
GROUP BY organization_id, DATE_TRUNC('month', occurred_at);

-- View for account balances (including transfers)
CREATE OR REPLACE VIEW v_account_balances AS
SELECT 
  a.id,
  a.organization_id,
  a.name,
  a.type,
  a.currency,
  a.initial_balance,
  a.initial_balance + COALESCE(
    SUM(CASE 
      WHEN t.type = 'income' AND t.account_id = a.id THEN t.amount
      WHEN t.type = 'expense' AND t.account_id = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
      WHEN t.type = 'transfer' AND t.transfer_to_account_id = a.id THEN t.amount
      ELSE 0
    END), 0
  ) as current_balance,
  a.created_at,
  a.updated_at
FROM accounts a
LEFT JOIN transactions t ON (
  t.account_id = a.id OR 
  t.transfer_to_account_id = a.id
)
GROUP BY a.id, a.organization_id, a.name, a.type, a.currency, a.initial_balance, a.created_at, a.updated_at;

-- View for category expenses summary
CREATE OR REPLACE VIEW v_category_expenses AS
SELECT 
  c.id,
  c.organization_id,
  c.name,
  c.type,
  c.color,
  COALESCE(SUM(t.amount), 0) as total_amount,
  COUNT(t.id) as transaction_count,
  c.created_at
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id AND t.type = c.type
GROUP BY c.id, c.organization_id, c.name, c.type, c.color, c.created_at;

-- Function to get organization KPIs for a specific month
CREATE OR REPLACE FUNCTION get_organization_kpis(org_id UUID, target_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_income NUMERIC,
  total_expenses NUMERIC,
  net_balance NUMERIC,
  transaction_count BIGINT,
  account_count BIGINT,
  category_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
    COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses,
    COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0) as net_balance,
    COUNT(t.id) as transaction_count,
    (SELECT COUNT(*) FROM accounts WHERE organization_id = org_id) as account_count,
    (SELECT COUNT(*) FROM categories WHERE organization_id = org_id) as category_count
  FROM transactions t
  WHERE t.organization_id = org_id 
    AND t.type IN ('income', 'expense')
    AND DATE_TRUNC('month', t.occurred_at) = DATE_TRUNC('month', target_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get top expense categories for an organization
CREATE OR REPLACE FUNCTION get_top_expense_categories(org_id UUID, limit_count INTEGER DEFAULT 5, target_month DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  category_id UUID,
  category_name VARCHAR,
  category_color VARCHAR,
  total_amount NUMERIC,
  transaction_count BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  total_expenses NUMERIC;
BEGIN
  -- Get total expenses for the month
  SELECT COALESCE(SUM(amount), 0) INTO total_expenses
  FROM transactions 
  WHERE organization_id = org_id 
    AND type = 'expense'
    AND DATE_TRUNC('month', occurred_at) = DATE_TRUNC('month', target_month);

  RETURN QUERY
  SELECT 
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    COALESCE(SUM(t.amount), 0) as total_amount,
    COUNT(t.id) as transaction_count,
    CASE 
      WHEN total_expenses > 0 THEN ROUND((COALESCE(SUM(t.amount), 0) / total_expenses * 100), 2)
      ELSE 0
    END as percentage
  FROM categories c
  LEFT JOIN transactions t ON c.id = t.category_id 
    AND t.organization_id = org_id
    AND t.type = 'expense'
    AND DATE_TRUNC('month', t.occurred_at) = DATE_TRUNC('month', target_month)
  WHERE c.organization_id = org_id AND c.type = 'expense'
  GROUP BY c.id, c.name, c.color
  ORDER BY total_amount DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invitation code
CREATE OR REPLACE FUNCTION generate_invitation_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM invitations WHERE invitations.code = code) INTO exists_check;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT exists_check;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on views (they inherit from base tables)
-- Views automatically respect RLS policies from underlying tables