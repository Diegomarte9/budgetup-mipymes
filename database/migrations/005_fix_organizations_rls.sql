-- Fix RLS policies for organizations table
-- This migration fixes the issue with creating organizations

-- Drop existing policies for organizations
DROP POLICY IF EXISTS "Users can view organizations they belong to" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;

-- Recreate organizations policies with proper permissions
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (is_member(id));

-- Allow authenticated users to create organizations (no restrictions on creation)
CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (is_owner(id));

CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (is_owner(id));

-- Also fix memberships policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON memberships;
DROP POLICY IF EXISTS "System can create memberships" ON memberships;
DROP POLICY IF EXISTS "Owners and admins can update memberships" ON memberships;
DROP POLICY IF EXISTS "Owners and admins can delete memberships" ON memberships;

-- Recreate memberships policies
CREATE POLICY "Users can view memberships in their organizations" ON memberships
  FOR SELECT USING (is_member(organization_id) OR user_id = auth.uid());

-- Allow authenticated users to create memberships (needed for onboarding)
CREATE POLICY "Authenticated users can create memberships" ON memberships
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Owners and admins can update memberships" ON memberships
  FOR UPDATE USING (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can delete memberships" ON memberships
  FOR DELETE USING (has_role(organization_id, 'admin'));