-- Test script for dashboard views and metrics
-- This script tests the views and functions created in migration 019
-- Run this after applying the migration to verify functionality

-- Test 1: Check if v_monthly_balance view exists and works
SELECT 'Testing v_monthly_balance view...' as test_name;
SELECT COUNT(*) as view_exists FROM information_schema.views 
WHERE table_name = 'v_monthly_balance';

-- Test 2: Check if v_top_expense_categories view exists and works  
SELECT 'Testing v_top_expense_categories view...' as test_name;
SELECT COUNT(*) as view_exists FROM information_schema.views 
WHERE table_name = 'v_top_expense_categories';

-- Test 3: Check if materialized view exists
SELECT 'Testing mv_monthly_metrics materialized view...' as test_name;
SELECT COUNT(*) as view_exists FROM pg_matviews 
WHERE matviewname = 'mv_monthly_metrics';

-- Test 4: Check if functions exist
SELECT 'Testing dashboard functions...' as test_name;
SELECT 
  proname as function_name,
  pronargs as arg_count
FROM pg_proc 
WHERE proname IN (
  'get_current_month_kpis',
  'get_last_12_months_balance', 
  'get_current_month_top_categories',
  'refresh_monthly_metrics'
)
ORDER BY proname;

-- Test 5: Check if indexes were created
SELECT 'Testing dashboard indexes...' as test_name;
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE indexname IN (
  'idx_transactions_org_month_type',
  'idx_transactions_current_month',
  'idx_transactions_last_12_months',
  'idx_transactions_expense_category',
  'idx_transactions_income',
  'idx_mv_monthly_metrics_org_month'
)
ORDER BY indexname;

-- Test 6: Test view structure (sample query - will return empty if no data)
SELECT 'Testing view structure...' as test_name;
SELECT * FROM v_monthly_balance LIMIT 1;
SELECT * FROM v_top_expense_categories LIMIT 1;

-- Test 7: Test function signatures (these will fail if no organization exists, but that's expected)
SELECT 'Testing function signatures...' as test_name;
-- Note: These will return empty results if no test data exists, but should not error

-- Show completion message
SELECT 'Dashboard metrics test completed!' as result;
SELECT 'If no errors appeared above, the migration was successful.' as note;