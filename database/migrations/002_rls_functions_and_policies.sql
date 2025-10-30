-- RLS Functions and Policies for BudgetUp MiPymes
-- This migration creates the RLS helper functions and policies for all tables

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

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to" ON organizations
  FOR SELECT USING (is_member(id));

CREATE POLICY "Users can create organizations" ON organizations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners can update their organizations" ON organizations
  FOR UPDATE USING (is_owner(id));

CREATE POLICY "Owners can delete their organizations" ON organizations
  FOR DELETE USING (is_owner(id));

-- Memberships policies
CREATE POLICY "Users can view memberships in their organizations" ON memberships
  FOR SELECT USING (is_member(organization_id) OR user_id = auth.uid());

CREATE POLICY "System can create memberships" ON memberships
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owners and admins can update memberships" ON memberships
  FOR UPDATE USING (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can delete memberships" ON memberships
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- Invitations policies
CREATE POLICY "Users can view invitations for their organizations" ON invitations
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Owners and admins can create invitations" ON invitations
  FOR INSERT WITH CHECK (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can update invitations" ON invitations
  FOR UPDATE USING (has_role(organization_id, 'admin'));

CREATE POLICY "Owners and admins can delete invitations" ON invitations
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- Accounts policies
CREATE POLICY "Users can view accounts in their organizations" ON accounts
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create accounts" ON accounts
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Members can update accounts" ON accounts
  FOR UPDATE USING (is_member(organization_id));

CREATE POLICY "Admins can delete accounts" ON accounts
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- Categories policies
CREATE POLICY "Users can view categories in their organizations" ON categories
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create categories" ON categories
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Members can update categories" ON categories
  FOR UPDATE USING (is_member(organization_id));

CREATE POLICY "Admins can delete categories" ON categories
  FOR DELETE USING (has_role(organization_id, 'admin'));

-- Transactions policies
CREATE POLICY "Users can view transactions in their organizations" ON transactions
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Members can create transactions" ON transactions
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (is_member(organization_id) AND (created_by = auth.uid() OR has_role(organization_id, 'admin')));

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (is_member(organization_id) AND (created_by = auth.uid() OR has_role(organization_id, 'admin')));

-- Audit logs policies
CREATE POLICY "Users can view audit logs for their organizations" ON audit_logs
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (is_member(organization_id));

-- No update or delete policies for audit logs (immutable)