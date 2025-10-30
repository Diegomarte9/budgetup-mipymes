-- Supabase Storage setup for transaction attachments
-- This migration creates the storage bucket and policies for transaction attachments
-- Requirements: 7.1, 7.2, 7.3

-- Create storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transaction-attachments',
  'transaction-attachments',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for transaction attachments
CREATE POLICY "Users can view attachments from their organizations" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'transaction-attachments' AND
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.attachment_url = 'transaction-attachments/' || name
      AND is_member(t.organization_id)
    )
  );

CREATE POLICY "Users can upload attachments for their organizations" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'transaction-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can update their own attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'transaction-attachments' AND
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.attachment_url = 'transaction-attachments/' || name
      AND t.created_by = auth.uid()
      AND is_member(t.organization_id)
    )
  );

CREATE POLICY "Users can delete their own attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'transaction-attachments' AND
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.attachment_url = 'transaction-attachments/' || name
      AND (t.created_by = auth.uid() OR has_role(t.organization_id, 'admin'))
      AND is_member(t.organization_id)
    )
  );

-- Function to generate secure file names for attachments
CREATE OR REPLACE FUNCTION generate_attachment_filename(
  organization_id UUID,
  original_filename TEXT
)
RETURNS TEXT AS $$
DECLARE
  file_extension TEXT;
  secure_filename TEXT;
BEGIN
  -- Extract file extension
  file_extension := LOWER(RIGHT(original_filename, 4));
  
  -- Generate secure filename with organization prefix and UUID
  secure_filename := organization_id::TEXT || '/' || gen_random_uuid()::TEXT;
  
  -- Add extension if it looks like one
  IF file_extension LIKE '.%' THEN
    secure_filename := secure_filename || file_extension;
  END IF;
  
  RETURN secure_filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up orphaned attachments
CREATE OR REPLACE FUNCTION cleanup_orphaned_attachments()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  attachment_record RECORD;
BEGIN
  FOR attachment_record IN
    SELECT name FROM storage.objects 
    WHERE bucket_id = 'transaction-attachments'
    AND NOT EXISTS (
      SELECT 1 FROM transactions 
      WHERE attachment_url = 'transaction-attachments/' || storage.objects.name
    )
  LOOP
    DELETE FROM storage.objects 
    WHERE bucket_id = 'transaction-attachments' 
    AND name = attachment_record.name;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up attachments when transactions are deleted
CREATE OR REPLACE FUNCTION cleanup_transaction_attachment()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.attachment_url IS NOT NULL THEN
    DELETE FROM storage.objects 
    WHERE bucket_id = 'transaction-attachments' 
    AND name = REPLACE(OLD.attachment_url, 'transaction-attachments/', '');
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for attachment cleanup
DROP TRIGGER IF EXISTS cleanup_transaction_attachment_trigger ON transactions;
CREATE TRIGGER cleanup_transaction_attachment_trigger
  AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION cleanup_transaction_attachment();

-- Add comments for documentation
COMMENT ON FUNCTION generate_attachment_filename(UUID, TEXT) IS 'Generates secure filenames for transaction attachments with organization prefix';
COMMENT ON FUNCTION cleanup_orphaned_attachments() IS 'Removes storage objects that no longer have corresponding transactions';
COMMENT ON FUNCTION cleanup_transaction_attachment() IS 'Cleans up attachment files when transactions are deleted';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;