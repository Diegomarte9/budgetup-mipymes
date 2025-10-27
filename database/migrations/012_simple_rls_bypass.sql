-- Simple RLS bypass function for organization creation
-- This function runs with elevated privileges and bypasses all RLS

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

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_org_bypass_rls TO authenticated;
GRANT EXECUTE ON FUNCTION create_org_bypass_rls TO anon;