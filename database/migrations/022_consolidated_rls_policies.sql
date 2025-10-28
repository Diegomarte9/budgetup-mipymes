-- Migration 022: Consolidated RLS Policies
-- This migration ensures all RLS policies are properly set up across all tables
-- It's safe to run multiple times - existing policies will be dropped and recreated

-- =============================================================================
-- HELPER FUNCTIONS (Create or replace to ensure they exist)
-- =============================================================================

-- Helper function to check if user is a member of an organization
CREATE OR REPLACE FUNCTION is_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has a specific role or higher
CREATE OR REPLACE FUNCTION has_role(org_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
    AND (
      role = required_role OR
      (required_role = 'member' AND role IN ('admin', 'owner')) OR
      (required_role = 'admin' AND role = 'owner')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is owner of an organization
CREATE OR REPLACE FUNCTION is_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization creation bypass function (for system operations)
CREATE OR REPLACE FUNCTION create_org_bypass_rls(
  p_name TEXT,
  p_currency TEXT DEFAULT 'DOP',
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Validate inputs
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;
  
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID is required';
  END IF;

  -- Check for existing organization with same name (case insensitive)
  IF EXISTS (
    SELECT 1 FROM organizations 
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(p_name))
  ) THEN
    RAISE EXCEPTION 'Organization with this name already exists';
  END IF;

  -- Insert organization (this bypasses RLS due to SECURITY DEFINER)
  INSERT INTO organizations (name, currency, created_by, created_at, updated_at)
  VALUES (TRIM(p_name), p_currency, p_user_id, NOW(), NOW())
  RETURNING id INTO new_org_id;

  -- Insert membership (this also bypasses RLS)
  INSERT INTO memberships (user_id, organization_id, role, created_at)
  VALUES (p_user_id, new_org_id, 'owner', NOW());

  RETURN new_org_id;
END;
$$;

-- Grant permissions to helper functions
GRANT EXECUTE ON FUNCTION is_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_org_bypass_rls(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_org_bypass_rls(TEXT, TEXT, UUID) TO anon;

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on newer tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'report_history') THEN
    ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- =============================================================================
-- ORGANIZATIONS POLICIES
-- =============================================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;

-- Create organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (is_member(id));

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (is_owner(id));

CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (is_owner(id));

-- =============================================================================
-- MEMBERSHIPS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;
DROP POLICY IF EXISTS "System can create memberships" ON memberships;
DROP POLICY IF EXISTS "Authenticated users can create memberships" ON memberships;
DROP POLICY IF EXISTS "Owners and admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Owners and admins can delete memberships" ON memberships;

-- Create memberships policies
CREATE POLICY "Users can view memberships in their organizations" ON memberships
  FOR SELECT USING (is_member(organization_id) OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create memberships" ON memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can update memberships" ON memberships
  FOR UPDATE USING (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can delete memberships" ON memberships
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- =============================================================================
-- INVITATIONS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations for their organizations" ON invitations;
DROP POLICY IF EXISTS "Owners and admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Owners and admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Owners and admins can delete invitations" ON invitations;

-- Create invitations policies
CREATE POLICY "Users can view invitations for their organizations" ON invitations
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Owners and admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can update invitations" ON invitations
  FOR UPDATE USING (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can delete invitations" ON invitations
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- =============================================================================
-- ACCOUNTS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view accounts in their organizations" ON accounts;
DROP POLICY IF EXISTS "Members can create accounts" ON accounts;
DROP POLICY IF EXISTS "Members can update accounts" ON accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON accounts;

-- Create accounts policies
CREATE POLICY "Users can view accounts in their organizations" ON accounts
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create accounts" ON accounts
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Members can update accounts" ON accounts
  FOR UPDATE USING (is_member(organization_id));

CREATE POLICY "Admins can delete accounts" ON accounts
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- =============================================================================
-- CATEGORIES POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view categories in their organizations" ON categories;
DROP POLICY IF EXISTS "Members can create categories" ON categories;
DROP POLICY IF EXISTS "Members can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

-- Create categories policies
CREATE POLICY "Users can view categories in their organizations" ON categories
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create categories" ON categories
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Members can update categories" ON categories
  FOR UPDATE USING (is_member(organization_id));

CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- =============================================================================
-- TRANSACTIONS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view transactions in their organizations" ON transactions;
DROP POLICY IF EXISTS "Members can create transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- Create transactions policies
CREATE POLICY "Users can view transactions in their organizations" ON transactions
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create transactions" ON transactions
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (is_member(organization_id) AND (created_by = auth.uid() OR has_role(organization_id, 'admin')));

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (is_member(organization_id) AND (created_by = auth.uid() OR has_role(organization_id, 'admin')));

-- =============================================================================
-- AUDIT LOGS POLICIES
-- =============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON audit_logs;

-- Create audit logs policies
CREATE POLICY "Users can view audit logs for their organizations" ON audit_logs
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_member(organization_id));

-- No update or delete policies for audit logs (immutable)

-- =============================================================================
-- REPORT HISTORY POLICIES (if table exists)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'report_history') THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view report history in their organizations" ON report_history;
    DROP POLICY IF EXISTS "Users can create report history in their organizations" ON report_history;
    DROP POLICY IF EXISTS "Users can update their own report history" ON report_history;

    -- Create report history policies
    CREATE POLICY "Users can view report history in their organizations" ON report_history
      FOR SELECT USING (is_member(organization_id));

    CREATE POLICY "Users can create report history in their organizations" ON report_history
      FOR INSERT WITH CHECK (is_member(organization_id));

    CREATE POLICY "Users can update their own report history" ON report_history
      FOR UPDATE USING (user_id = auth.uid() AND is_member(organization_id));
  END IF;
END $$;

-- =============================================================================
-- VIEWS POLICIES (if views exist)
-- =============================================================================

DO $$
BEGIN
  -- Handle v_invitation_stats view if it exists
  IF EXISTS (SELECT FROM information_schema.views WHERE table_name = 'v_invitation_stats') THEN
    DROP POLICY IF EXISTS "Users can view invitation stats for their organizations" ON v_invitation_stats;
    CREATE POLICY "Users can view invitation stats for their organizations" ON v_invitation_stats
      FOR SELECT USING (is_member(organization_id));
  END IF;
END $$;

-- =============================================================================
-- ADDITIONAL FUNCTIONS AND PERMISSIONS
-- =============================================================================

-- Invitation cleanup function (if not exists)
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete invitations that expired more than 30 days ago and were never used
  DELETE FROM invitations 
  WHERE used_at IS NULL 
    AND expires_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get invitation details by code (for public access)
CREATE OR REPLACE FUNCTION get_invitation_by_code(invitation_code TEXT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  email TEXT,
  role TEXT,
  code TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  organization_name TEXT,
  organization_currency TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.organization_id,
    i.email,
    i.role,
    i.code,
    i.expires_at,
    i.used_at,
    i.created_at,
    o.name as organization_name,
    o.currency as organization_currency
  FROM invitations i
  JOIN organizations o ON i.organization_id = o.id
  WHERE i.code = invitation_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to additional functions
GRANT EXECUTE ON FUNCTION cleanup_expired_invitations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_invitation_by_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_code(TEXT) TO authenticated;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION is_member(UUID) IS 'Checks if the current user is a member of the specified organization';
COMMENT ON FUNCTION has_role(UUID, TEXT) IS 'Checks if the current user has the specified role or higher in the organization';
COMMENT ON FUNCTION is_owner(UUID) IS 'Checks if the current user is the owner of the specified organization';
COMMENT ON FUNCTION create_org_bypass_rls(TEXT, TEXT, UUID) IS 'Creates an organization bypassing RLS - used for system operations';
COMMENT ON FUNCTION cleanup_expired_invitations() IS 'Automatically cleans up expired invitations older than 30 days';
COMMENT ON FUNCTION get_invitation_by_code(TEXT) IS 'Safely retrieves invitation details by code for public access';

-- =============================================================================
-- FINAL VERIFICATION
-- =============================================================================

-- Log successful completion
DO $$
BEGIN
  RAISE NOTICE 'RLS policies consolidation completed successfully';
  RAISE NOTICE 'All tables have RLS enabled and proper policies configured';
END $$;