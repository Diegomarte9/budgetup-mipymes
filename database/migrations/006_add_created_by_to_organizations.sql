-- Add created_by field to organizations table
-- This migration adds a field to track who created each organization

ALTER TABLE organizations 
ADD COLUMN created_by UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);

-- Update existing organizations to set created_by based on owner membership
-- This is for any existing data
UPDATE organizations 
SET created_by = (
  SELECT user_id 
  FROM memberships 
  WHERE organization_id = organizations.id 
  AND role = 'owner' 
  LIMIT 1
)
WHERE created_by IS NULL;