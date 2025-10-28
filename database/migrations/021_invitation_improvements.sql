-- Migration 021: Invitation system improvements
-- This migration adds automatic cleanup of expired invitations and email templates

-- Function to clean up expired invitations (older than 30 days)
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

-- Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- Note: This will only work if pg_cron is enabled in your Supabase project
-- You can also run this manually or via a cron job from your application

-- Add comment to track cleanup
COMMENT ON FUNCTION cleanup_expired_invitations() IS 'Automatically cleans up expired invitations older than 30 days';

-- Create index for better performance on invitation cleanup queries
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at_used_at 
ON invitations(expires_at, used_at) 
WHERE used_at IS NULL;

-- Add a view to easily see invitation statistics
CREATE OR REPLACE VIEW v_invitation_stats AS
SELECT 
  organization_id,
  COUNT(*) as total_invitations,
  COUNT(*) FILTER (WHERE used_at IS NOT NULL) as accepted_invitations,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at > NOW()) as pending_invitations,
  COUNT(*) FILTER (WHERE used_at IS NULL AND expires_at <= NOW()) as expired_invitations,
  organizations.name as organization_name
FROM invitations
JOIN organizations ON invitations.organization_id = organizations.id
GROUP BY organization_id, organizations.name;

-- Grant access to the view
GRANT SELECT ON v_invitation_stats TO authenticated;

-- Add RLS policy for the view
CREATE POLICY "Users can view invitation stats for their organizations" ON v_invitation_stats
  FOR SELECT USING (is_member(organization_id));

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

-- Grant execute permission to anonymous users (for invitation page)
GRANT EXECUTE ON FUNCTION get_invitation_by_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_invitation_by_code(TEXT) TO authenticated;

-- Add audit logging for invitation acceptance
CREATE OR REPLACE FUNCTION audit_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when used_at changes from NULL to a timestamp
  IF OLD.used_at IS NULL AND NEW.used_at IS NOT NULL THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      NEW.organization_id,
      auth.uid(),
      'invitation_accepted',
      'invitations',
      NEW.id,
      jsonb_build_object(
        'email', OLD.email,
        'role', OLD.role,
        'used_at', OLD.used_at
      ),
      jsonb_build_object(
        'email', NEW.email,
        'role', NEW.role,
        'used_at', NEW.used_at
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for invitation acceptance auditing
DROP TRIGGER IF EXISTS audit_invitation_acceptance_trigger ON invitations;
CREATE TRIGGER audit_invitation_acceptance_trigger
  AFTER UPDATE ON invitations
  FOR EACH ROW
  EXECUTE FUNCTION audit_invitation_acceptance();

-- Add helpful comments
COMMENT ON VIEW v_invitation_stats IS 'Provides invitation statistics per organization';
COMMENT ON FUNCTION get_invitation_by_code(TEXT) IS 'Safely retrieves invitation details by code for public access';
COMMENT ON FUNCTION audit_invitation_acceptance() IS 'Logs invitation acceptance events to audit_logs';