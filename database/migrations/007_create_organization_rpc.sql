-- Create RPC function to atomically create organization and membership
-- This function bypasses RLS issues by running with elevated privileges

CREATE OR REPLACE FUNCTION create_organization_with_owner(
  org_name TEXT,
  org_currency TEXT DEFAULT 'DOP',
  owner_user_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Validate input
  IF org_name IS NULL OR org_name = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;
  
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user ID cannot be null';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, currency, created_by)
  VALUES (org_name, org_currency, owner_user_id)
  RETURNING id INTO new_org_id;

  -- Create the owner membership
  INSERT INTO memberships (user_id, organization_id, role)
  VALUES (owner_user_id, new_org_id, 'owner');

  -- Return the organization ID
  RETURN new_org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;