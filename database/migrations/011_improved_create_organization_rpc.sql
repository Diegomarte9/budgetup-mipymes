-- Improved RPC function to create organization and membership with better error handling
-- This function completely bypasses RLS issues

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS create_organization_with_owner(TEXT, TEXT, UUID);

-- Create improved function
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
  existing_org_count INTEGER;
BEGIN
  -- Validate input
  IF org_name IS NULL OR TRIM(org_name) = '' THEN
    RAISE EXCEPTION 'Organization name cannot be empty';
  END IF;
  
  IF owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Owner user ID cannot be null';
  END IF;

  -- Check for duplicate organization names (case-insensitive)
  SELECT COUNT(*) INTO existing_org_count
  FROM organizations 
  WHERE LOWER(TRIM(name)) = LOWER(TRIM(org_name));
  
  IF existing_org_count > 0 THEN
    RAISE EXCEPTION 'An organization with this name already exists';
  END IF;

  -- Create the organization
  INSERT INTO organizations (name, currency, created_by)
  VALUES (TRIM(org_name), org_currency, owner_user_id)
  RETURNING id INTO new_org_id;

  -- Create the owner membership
  INSERT INTO memberships (user_id, organization_id, role)
  VALUES (owner_user_id, new_org_id, 'owner');

  -- Return the organization ID
  RETURN new_org_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'An organization with this name already exists';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating organization: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO authenticated;
GRANT EXECUTE ON FUNCTION create_organization_with_owner TO anon;