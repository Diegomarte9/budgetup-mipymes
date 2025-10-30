-- Audit Triggers for BudgetUp MiPymes
-- This migration creates automatic audit logging for all important tables

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get organization_id from the record
  IF TG_OP = 'DELETE' THEN
    org_id := OLD.organization_id;
  ELSE
    org_id := NEW.organization_id;
  END IF;

  -- Insert audit log
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      org_id,
      auth.uid(),
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      org_id,
      auth.uid(),
      'update',
      TG_TABLE_NAME,
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      org_id,
      auth.uid(),
      'create',
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Special audit function for organizations (no organization_id field)
CREATE OR REPLACE FUNCTION audit_organizations_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      OLD.id,
      auth.uid(),
      'delete',
      'organizations',
      OLD.id,
      row_to_json(OLD),
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      'update',
      'organizations',
      NEW.id,
      row_to_json(OLD),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      organization_id,
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      auth.uid(),
      'create',
      'organizations',
      NEW.id,
      NULL,
      row_to_json(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all tables
CREATE TRIGGER audit_organizations_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_organizations_function();

CREATE TRIGGER audit_memberships_trigger
  AFTER INSERT OR UPDATE OR DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_accounts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_categories_trigger
  AFTER INSERT OR UPDATE OR DELETE ON categories
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_transactions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Note: We don't audit invitations and audit_logs themselves to avoid noise