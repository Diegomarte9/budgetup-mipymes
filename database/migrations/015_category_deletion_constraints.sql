-- Category deletion constraints and validation
-- This migration implements requirement 6.5: categories can only be deleted if they have no associated transactions

-- Function to check if a category can be deleted (no associated transactions)
CREATE OR REPLACE FUNCTION check_category_deletion()
RETURNS TRIGGER AS $
DECLARE
  transaction_count INTEGER;
BEGIN
  -- Check if there are any transactions associated with this category
  SELECT COUNT(*) INTO transaction_count
  FROM transactions 
  WHERE category_id = OLD.id;
  
  -- If there are associated transactions, prevent deletion
  IF transaction_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it has % associated transaction(s). Please reassign or delete the transactions first.', 
      OLD.name, transaction_count;
  END IF;
  
  RETURN OLD;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent deletion of categories with associated transactions
DROP TRIGGER IF EXISTS prevent_category_deletion_with_transactions ON categories;
CREATE TRIGGER prevent_category_deletion_with_transactions
  BEFORE DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION check_category_deletion();

-- Function to check if an account can be deleted (no associated transactions)
CREATE OR REPLACE FUNCTION check_account_deletion()
RETURNS TRIGGER AS $
DECLARE
  transaction_count INTEGER;
  transfer_count INTEGER;
BEGIN
  -- Check if there are any transactions associated with this account
  SELECT COUNT(*) INTO transaction_count
  FROM transactions 
  WHERE account_id = OLD.id;
  
  -- Check if there are any transfers to this account
  SELECT COUNT(*) INTO transfer_count
  FROM transactions 
  WHERE transfer_to_account_id = OLD.id;
  
  -- If there are associated transactions, prevent deletion
  IF transaction_count > 0 OR transfer_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete account "%" because it has % transaction(s) and % transfer(s). Please reassign or delete the transactions first.', 
      OLD.name, transaction_count, transfer_count;
  END IF;
  
  RETURN OLD;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to prevent deletion of accounts with associated transactions
DROP TRIGGER IF EXISTS prevent_account_deletion_with_transactions ON accounts;
CREATE TRIGGER prevent_account_deletion_with_transactions
  BEFORE DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION check_account_deletion();

-- Function to validate transaction constraints
CREATE OR REPLACE FUNCTION validate_transaction_constraints()
RETURNS TRIGGER AS $
BEGIN
  -- Ensure transfer transactions have both account_id and transfer_to_account_id
  IF NEW.type = 'transfer' THEN
    IF NEW.account_id IS NULL OR NEW.transfer_to_account_id IS NULL THEN
      RAISE EXCEPTION 'Transfer transactions must have both source account (account_id) and destination account (transfer_to_account_id)';
    END IF;
    
    -- Ensure source and destination accounts are different
    IF NEW.account_id = NEW.transfer_to_account_id THEN
      RAISE EXCEPTION 'Transfer source and destination accounts must be different';
    END IF;
    
    -- Ensure both accounts belong to the same organization
    IF NOT EXISTS (
      SELECT 1 FROM accounts a1, accounts a2 
      WHERE a1.id = NEW.account_id 
      AND a2.id = NEW.transfer_to_account_id 
      AND a1.organization_id = a2.organization_id
      AND a1.organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Transfer accounts must belong to the same organization';
    END IF;
    
    -- Transfer transactions should not have a category
    NEW.category_id := NULL;
  ELSE
    -- Non-transfer transactions should not have transfer_to_account_id
    NEW.transfer_to_account_id := NULL;
    
    -- Income and expense transactions must have a category
    IF NEW.category_id IS NULL THEN
      RAISE EXCEPTION '% transactions must have a category', NEW.type;
    END IF;
    
    -- Validate that category type matches transaction type
    IF NOT EXISTS (
      SELECT 1 FROM categories 
      WHERE id = NEW.category_id 
      AND type = NEW.type 
      AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'Category type must match transaction type (% transaction requires % category)', NEW.type, NEW.type;
    END IF;
  END IF;
  
  -- Ensure account belongs to the same organization as the transaction
  IF NOT EXISTS (
    SELECT 1 FROM accounts 
    WHERE id = NEW.account_id 
    AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Account must belong to the same organization as the transaction';
  END IF;
  
  -- Validate ITBIS percentage (should be between 0 and 100)
  IF NEW.itbis_pct IS NOT NULL AND (NEW.itbis_pct < 0 OR NEW.itbis_pct > 100) THEN
    RAISE EXCEPTION 'ITBIS percentage must be between 0 and 100';
  END IF;
  
  -- Ensure occurred_at is not in the future
  IF NEW.occurred_at > CURRENT_DATE THEN
    RAISE EXCEPTION 'Transaction date cannot be in the future';
  END IF;
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transaction validation
DROP TRIGGER IF EXISTS validate_transaction_constraints_trigger ON transactions;
CREATE TRIGGER validate_transaction_constraints_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_constraints();

-- Add comments for documentation
COMMENT ON FUNCTION check_category_deletion() IS 'Prevents deletion of categories that have associated transactions (requirement 6.5)';
COMMENT ON FUNCTION check_account_deletion() IS 'Prevents deletion of accounts that have associated transactions';
COMMENT ON FUNCTION validate_transaction_constraints() IS 'Validates transaction business rules and constraints';