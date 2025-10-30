-- Default Categories Seed for BudgetUp MiPymes
-- This seed creates default categories typical for Dominican MiPymes

-- Function to create default categories for a new organization
CREATE OR REPLACE FUNCTION create_default_categories(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default Income Categories
  INSERT INTO categories (organization_id, name, type, color) VALUES
    (org_id, 'Ventas', 'income', '#10B981'),
    (org_id, 'Servicios', 'income', '#059669'),
    (org_id, 'Comisiones', 'income', '#047857'),
    (org_id, 'Intereses', 'income', '#065F46'),
    (org_id, 'Otros Ingresos', 'income', '#064E3B');

  -- Default Expense Categories
  INSERT INTO categories (organization_id, name, type, color) VALUES
    (org_id, 'Nómina', 'expense', '#EF4444'),
    (org_id, 'Renta', 'expense', '#DC2626'),
    (org_id, 'Servicios Públicos', 'expense', '#B91C1C'),
    (org_id, 'Combustible', 'expense', '#991B1B'),
    (org_id, 'Mantenimiento', 'expense', '#7F1D1D'),
    (org_id, 'Publicidad', 'expense', '#F97316'),
    (org_id, 'Materiales', 'expense', '#EA580C'),
    (org_id, 'Impuestos', 'expense', '#C2410C'),
    (org_id, 'Seguros', 'expense', '#9A3412'),
    (org_id, 'Telecomunicaciones', 'expense', '#7C2D12'),
    (org_id, 'Transporte', 'expense', '#8B5CF6'),
    (org_id, 'Alimentación', 'expense', '#7C3AED'),
    (org_id, 'Papelería', 'expense', '#6D28D9'),
    (org_id, 'Capacitación', 'expense', '#5B21B6'),
    (org_id, 'Otros Gastos', 'expense', '#4C1D95');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create default accounts for a new organization
CREATE OR REPLACE FUNCTION create_default_accounts(org_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Default accounts typical for Dominican MiPymes
  INSERT INTO accounts (organization_id, name, type, currency, initial_balance) VALUES
    (org_id, 'Efectivo', 'cash', 'DOP', 0),
    (org_id, 'Cuenta Corriente', 'bank', 'DOP', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to automatically create default categories and accounts for new organizations
CREATE OR REPLACE FUNCTION setup_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default categories
  PERFORM create_default_categories(NEW.id);
  
  -- Create default accounts
  PERFORM create_default_accounts(NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically setup new organizations
CREATE TRIGGER setup_new_organization_trigger
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION setup_new_organization();