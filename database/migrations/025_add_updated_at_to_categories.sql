-- Add updated_at column to categories table and trigger
-- This fixes the error when updating categories

-- Add updated_at column to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at column
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();