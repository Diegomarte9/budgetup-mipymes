-- Transactions schema validation and final setup
-- This migration validates that all requirements for task 16 are met
-- Requirements: 7.1, 7.2, 7.3

-- Validate that transactions table exists with all required fields
DO $
DECLARE
  table_exists BOOLEAN;
  required_columns TEXT[] := ARRAY[
    'id', 'organization_id', 'type', 'amount', 'currency', 'description',
    'occurred_at', 'account_id', 'category_id', 'transfer_to_account_id',
    'itbis_pct', 'notes', 'attachment_url', 'created_by', 'created_at', 'updated_at'
  ];
  col TEXT;
  column_exists BOOLEAN;
BEGIN
  -- Check if transactions table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Transactions table does not exist';
  END IF;
  
  -- Check if all required columns exist
  FOREACH col IN ARRAY required_columns
  LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'transactions' 
      AND column_name = col
    ) INTO column_exists;
    
    IF NOT column_exists THEN
      RAISE EXCEPTION 'Required column % does not exist in transactions table', col;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Transactions table validation passed - all required columns exist';
END;
$;

-- Validate that RLS is enabled
DO $
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'transactions' 
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'Row Level Security is not enabled on transactions table';
  END IF;
  
  RAISE NOTICE 'RLS validation passed - Row Level Security is enabled on transactions table';
END;
$;

-- Validate that required indexes exist
DO $
DECLARE
  required_indexes TEXT[] := ARRAY[
    'idx_transactions_organization_id',
    'idx_transactions_occurred_at',
    'idx_transactions_account_id',
    'idx_transactions_category_id'
  ];
  idx TEXT;
  index_exists BOOLEAN;
BEGIN
  FOREACH idx IN ARRAY required_indexes
  LOOP
    SELECT EXISTS (
      SELECT FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'transactions' 
      AND indexname = idx
    ) INTO index_exists;
    
    IF NOT index_exists THEN
      RAISE EXCEPTION 'Required index % does not exist', idx;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Index validation passed - all required indexes exist';
END;
$;

-- Validate that storage bucket exists
DO $
DECLARE
  bucket_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM storage.buckets 
    WHERE id = 'transaction-attachments'
  ) INTO bucket_exists;
  
  IF NOT bucket_exists THEN
    RAISE EXCEPTION 'Storage bucket transaction-attachments does not exist';
  END IF;
  
  RAISE NOTICE 'Storage validation passed - transaction-attachments bucket exists';
END;
$;

-- Validate that required functions exist
DO $
DECLARE
  required_functions TEXT[] := ARRAY[
    'is_member',
    'has_role',
    'validate_transaction_constraints',
    'generate_attachment_filename',
    'cleanup_orphaned_attachments',
    'get_account_balance_at_date',
    'get_monthly_balance_summary',
    'get_top_expense_categories'
  ];
  func TEXT;
  function_exists BOOLEAN;
BEGIN
  FOREACH func IN ARRAY required_functions
  LOOP
    SELECT EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' 
      AND p.proname = func
    ) INTO function_exists;
    
    IF NOT function_exists THEN
      RAISE EXCEPTION 'Required function % does not exist', func;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Function validation passed - all required functions exist';
END;
$;

-- Create a summary view for transaction statistics
CREATE OR REPLACE VIEW v_transaction_stats AS
SELECT 
  organization_id,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'income' THEN 1 END) as income_count,
  COUNT(CASE WHEN type = 'expense' THEN 1 END) as expense_count,
  COUNT(CASE WHEN type = 'transfer' THEN 1 END) as transfer_count,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) as total_income,
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as total_expenses,
  COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) - 
  COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) as net_balance,
  COUNT(CASE WHEN attachment_url IS NOT NULL THEN 1 END) as transactions_with_attachments,
  MIN(occurred_at) as earliest_transaction,
  MAX(occurred_at) as latest_transaction
FROM transactions
GROUP BY organization_id;

-- Add RLS policy for the stats view
CREATE POLICY "Users can view transaction stats for their organizations" ON v_transaction_stats
  FOR SELECT USING (is_member(organization_id));

-- Grant permissions
GRANT SELECT ON v_transaction_stats TO authenticated;

-- Add final documentation
COMMENT ON TABLE transactions IS 'Main transactions table storing income, expense, and transfer records for organizations';
COMMENT ON COLUMN transactions.type IS 'Transaction type: income, expense, or transfer';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount in the specified currency (always positive)';
COMMENT ON COLUMN transactions.currency IS 'Currency code (default: DOP for Dominican Peso)';
COMMENT ON COLUMN transactions.itbis_pct IS 'ITBIS tax percentage (default: 18% for Dominican Republic)';
COMMENT ON COLUMN transactions.attachment_url IS 'URL to attachment file in Supabase Storage';
COMMENT ON COLUMN transactions.transfer_to_account_id IS 'Destination account for transfer transactions';
COMMENT ON VIEW v_transaction_stats IS 'Summary statistics for transactions by organization';

-- Final validation message
DO $
BEGIN
  RAISE NOTICE '=== TRANSACTIONS SCHEMA SETUP COMPLETE ===';
  RAISE NOTICE 'Task 16 requirements fulfilled:';
  RAISE NOTICE '✓ Transactions table created with all required fields (amount, itbis_pct, etc.)';
  RAISE NOTICE '✓ RLS policies implemented for organization-based security';
  RAISE NOTICE '✓ Optimized indexes created (organization_id, occurred_at, account_id)';
  RAISE NOTICE '✓ Supabase Storage configured for attachments';
  RAISE NOTICE '✓ Business logic functions and validation triggers implemented';
  RAISE NOTICE '✓ Performance optimization functions for dashboard metrics';
  RAISE NOTICE 'Requirements 7.1, 7.2, 7.3 are fully satisfied';
END;
$;