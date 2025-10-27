-- Enhanced schema for accounts and categories with additional validations and optimizations
-- This migration adds enhanced constraints, validations, and indexes for accounts and categories tables

-- Add additional constraints for accounts table
ALTER TABLE accounts 
ADD CONSTRAINT accounts_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
ADD CONSTRAINT accounts_currency_valid CHECK (currency ~ '^[A-Z]{3}$'),
ADD CONSTRAINT accounts_initial_balance_precision CHECK (initial_balance = ROUND(initial_balance, 2));

-- Add additional constraints for categories table  
ALTER TABLE categories
ADD CONSTRAINT categories_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
ADD CONSTRAINT categories_color_valid CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

-- Add constraint to ensure account names are unique per organization (case-insensitive)
DROP INDEX IF EXISTS idx_accounts_org_name_unique;
CREATE UNIQUE INDEX idx_accounts_org_name_unique ON accounts(organization_id, LOWER(TRIM(name)));

-- Add constraint to ensure category names are unique per organization and type (case-insensitive)
DROP INDEX IF EXISTS idx_categories_org_name_type_unique;
CREATE UNIQUE INDEX idx_categories_org_name_type_unique ON categories(organization_id, LOWER(TRIM(name)), type);

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_currency ON accounts(currency);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON categories(created_at);

-- Add composite indexes for common filtering scenarios
CREATE INDEX IF NOT EXISTS idx_accounts_org_type ON accounts(organization_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_org_type ON categories(organization_id, type);

-- Function to validate account balance constraints
CREATE OR REPLACE FUNCTION validate_account_balance()
RETURNS TRIGGER AS $
BEGIN
  -- Ensure initial_balance is within reasonable limits
  IF NEW.initial_balance < -999999999999.99 OR NEW.initial_balance > 999999999999.99 THEN
    RAISE EXCEPTION 'Initial balance must be between -999,999,999,999.99 and 999,999,999,999.99';
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add trigger for account balance validation
DROP TRIGGER IF EXISTS validate_account_balance_trigger ON accounts;
CREATE TRIGGER validate_account_balance_trigger
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION validate_account_balance();

-- Function to validate category constraints
CREATE OR REPLACE FUNCTION validate_category_constraints()
RETURNS TRIGGER AS $
BEGIN
  -- Ensure category name doesn't contain only whitespace
  IF LENGTH(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Category name cannot be empty or contain only whitespace';
  END IF;
  
  -- Normalize category name (trim whitespace)
  NEW.name := TRIM(NEW.name);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add trigger for category validation
DROP TRIGGER IF EXISTS validate_category_constraints_trigger ON categories;
CREATE TRIGGER validate_category_constraints_trigger
  BEFORE INSERT OR UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION validate_category_constraints();

-- Function to validate account constraints
CREATE OR REPLACE FUNCTION validate_account_constraints()
RETURNS TRIGGER AS $
BEGIN
  -- Ensure account name doesn't contain only whitespace
  IF LENGTH(TRIM(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Account name cannot be empty or contain only whitespace';
  END IF;
  
  -- Normalize account name (trim whitespace)
  NEW.name := TRIM(NEW.name);
  
  -- Ensure currency is uppercase
  NEW.currency := UPPER(NEW.currency);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Add trigger for account validation
DROP TRIGGER IF EXISTS validate_account_constraints_trigger ON accounts;
CREATE TRIGGER validate_account_constraints_trigger
  BEFORE INSERT OR UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION validate_account_constraints();

-- Add function to get account balance (for requirement 5.5)
CREATE OR REPLACE FUNCTION get_account_balance(account_uuid UUID)
RETURNS NUMERIC(14,2) AS $
DECLARE
  balance NUMERIC(14,2);
  initial_bal NUMERIC(14,2);
  income_total NUMERIC(14,2);
  expense_total NUMERIC(14,2);
  transfer_in NUMERIC(14,2);
  transfer_out NUMERIC(14,2);
BEGIN
  -- Get initial balance
  SELECT initial_balance INTO initial_bal 
  FROM accounts 
  WHERE id = account_uuid;
  
  IF initial_bal IS NULL THEN
    RETURN 0;
  END IF;
  
  -- Calculate income total
  SELECT COALESCE(SUM(amount), 0) INTO income_total
  FROM transactions 
  WHERE account_id = account_uuid AND type = 'income';
  
  -- Calculate expense total  
  SELECT COALESCE(SUM(amount), 0) INTO expense_total
  FROM transactions 
  WHERE account_id = account_uuid AND type = 'expense';
  
  -- Calculate transfers in (money coming to this account)
  SELECT COALESCE(SUM(amount), 0) INTO transfer_in
  FROM transactions 
  WHERE transfer_to_account_id = account_uuid AND type = 'transfer';
  
  -- Calculate transfers out (money going from this account)
  SELECT COALESCE(SUM(amount), 0) INTO transfer_out
  FROM transactions 
  WHERE account_id = account_uuid AND type = 'transfer';
  
  -- Calculate final balance
  balance := initial_bal + income_total - expense_total + transfer_in - transfer_out;
  
  RETURN balance;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for accounts with current balance (requirement 5.5)
CREATE OR REPLACE VIEW accounts_with_balance AS
SELECT 
  a.*,
  get_account_balance(a.id) as current_balance
FROM accounts a;

-- Grant appropriate permissions for the view
GRANT SELECT ON accounts_with_balance TO authenticated;

-- Add RLS policy for the view
ALTER VIEW accounts_with_balance OWNER TO postgres;
CREATE POLICY "Users can view account balances in their organizations" ON accounts_with_balance
  FOR SELECT USING (is_member(organization_id));

-- Add comment documentation
COMMENT ON TABLE accounts IS 'Financial accounts (cash, bank, credit card) for organizations';
COMMENT ON TABLE categories IS 'Transaction categories (income/expense) for organizations';
COMMENT ON FUNCTION get_account_balance(UUID) IS 'Calculates current balance for an account including all transactions';
COMMENT ON VIEW accounts_with_balance IS 'Accounts with calculated current balance';

-- Add column comments for better documentation
COMMENT ON COLUMN accounts.type IS 'Account type: cash, bank, or credit_card';
COMMENT ON COLUMN accounts.currency IS 'ISO 4217 currency code (default: DOP)';
COMMENT ON COLUMN accounts.initial_balance IS 'Starting balance when account was created';
COMMENT ON COLUMN categories.type IS 'Category type: income or expense';
COMMENT ON COLUMN categories.color IS 'Hex color code for UI display (optional)';