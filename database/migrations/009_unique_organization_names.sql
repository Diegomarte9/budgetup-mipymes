-- Add unique constraint to organization names
-- This ensures no two organizations can have the same name

-- Add unique constraint on organization name (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_name_unique 
ON organizations (LOWER(name));

-- Alternative: If you want case-sensitive uniqueness, use this instead:
-- ALTER TABLE organizations ADD CONSTRAINT unique_organization_name UNIQUE (name);