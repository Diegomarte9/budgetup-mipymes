-- Create a function to get memberships with user email
-- This function bypasses RLS to get user emails from auth.users

CREATE OR REPLACE FUNCTION get_organization_memberships(org_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  organization_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  user_email TEXT
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.user_id,
    m.organization_id,
    m.role,
    m.created_at,
    COALESCE(u.email, 'Email no disponible') as user_email
  FROM memberships m
  LEFT JOIN auth.users u ON m.user_id = u.id
  WHERE m.organization_id = org_id
  ORDER BY m.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_organization_memberships(UUID) TO authenticated;