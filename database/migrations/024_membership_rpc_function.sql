-- Drop existing function and create new RPC function to get organization memberships with user details
-- This solves the relationship cache issue with Supabase

DROP FUNCTION IF EXISTS get_organization_memberships(UUID);

CREATE OR REPLACE FUNCTION get_organization_memberships(org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  users JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.role,
    m.created_at,
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'created_at', u.created_at
    ) as users
  FROM memberships m
  JOIN auth.users u ON m.user_id = u.id
  WHERE m.organization_id = org_id
  ORDER BY m.created_at DESC;
END;
$$;