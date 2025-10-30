-- Add account_number field to accounts table
-- This field will store bank account numbers or credit card numbers

ALTER TABLE accounts 
ADD COLUMN account_number VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN accounts.account_number IS 'Account number for bank accounts or credit card numbers. Optional field.';

-- Create index for account number lookups (partial index for non-null values)
CREATE INDEX IF NOT EXISTS idx_accounts_account_number 
ON accounts(account_number) 
WHERE account_number IS NOT NULL;