-- Default categories seed for BudgetUp MiPymes
-- This migration creates default categories typical for MiPymes as per requirement 6.2

-- Function to create default categories for an organization
CREATE OR REPLACE FUNCTION create_default_categories(org_id UUID)
RETURNS VOID AS $
BEGIN
  -- Default income categories
  INSERT INTO categories (organization_id, name, type, color) VALUES
    (org_id, 'Ventas', 'income', '#10B981'),
    (org_id, 'Servicios', 'income', '#059669'),
    (org_id, 'Ingresos por Intereses', 'income', '#047857'),
    (org_id, 'Otros Ingresos', 'income', '#065F46')
  ON CONFLICT (organization_id, LOWER(TRIM(name)), type) DO NOTHING;
  
  -- Default expense categories
  INSERT INTO categories (organization_id, name, type, color) VALUES
    (org_id, 'Nómina', 'expense', '#EF4444'),
    (org_id, 'Renta', 'expense', '#DC2626'),
    (org_id, 'Servicios Públicos', 'expense', '#B91C1C'),
    (org_id, 'Impuestos', 'expense', '#991B1B'),
    (org_id, 'Suministros de Oficina', 'expense', '#7F1D1D'),
    (org_id, 'Marketing y Publicidad', 'expense', '#F97316'),
    (org_id, 'Transporte', 'expense', '#EA580C'),
    (org_id, 'Mantenimiento', 'expense', '#C2410C'),
    (org_id, 'Seguros', 'expense', '#9A3412'),
    (org_id, 'Gastos Bancarios', 'expense', '#7C2D12'),
    (org_id, 'Otros Gastos', 'expense', '#6B7280')
  ON CONFLICT (organization_id, LOWER(TRIM(name)), type) DO NOTHING;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default accounts for an organization
CREATE OR REPLACE FUNCTION create_default_accounts(org_id UUID)
RETURNS VOID AS $
BEGIN
  -- Default accounts
  INSERT INTO accounts (organization_id, name, type, currency, initial_balance) VALUES
    (org_id, 'Efectivo', 'cash', 'DOP', 0.00),
    (org_id, 'Cuenta Corriente Principal', 'bank', 'DOP', 0.00)
  ON CONFLICT (organization_id, LOWER(TRIM(name))) DO NOTHING;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create default categories and accounts when an organization is created
CREATE OR REPLACE FUNCTION auto_create_defaults_for_organization()
RETURNS TRIGGER AS $
BEGIN
  -- Create default categories and accounts for the new organization
  PERFORM create_default_categories(NEW.id);
  PERFORM create_default_accounts(NEW.id);
  
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set up defaults for new organizations
DROP TRIGGER IF EXISTS auto_create_defaults_trigger ON organizations;
CREATE TRIGGER auto_create_defaults_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION auto_create_defaults_for_organization();

-- Add comments for documentation
COMMENT ON FUNCTION create_default_categories(UUID) IS 'Creates default income and expense categories for a new organization';
COMMENT ON FUNCTION create_default_accounts(UUID) IS 'Creates default cash and bank accounts for a new organization';
COMMENT ON FUNCTION auto_create_defaults_for_organization() IS 'Trigger function to automatically create defaults when organization is created';