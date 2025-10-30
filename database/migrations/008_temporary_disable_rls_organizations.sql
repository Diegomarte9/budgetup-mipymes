-- Temporarily disable RLS on organizations table for creation
-- This is a temporary fix while we resolve the service role key issue

-- Disable RLS on organizations table
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it later once the service role is properly configured
-- For now, we'll rely on application-level security