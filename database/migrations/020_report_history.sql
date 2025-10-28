-- Migration: Report History
-- Description: Create table to track generated reports for audit and history purposes

-- Create report_history table
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type VARCHAR(10) CHECK (report_type IN ('csv', 'pdf')) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}',
  transaction_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes INTEGER,
  generation_time_ms INTEGER,
  status VARCHAR(20) CHECK (status IN ('generating', 'completed', 'failed')) DEFAULT 'generating',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_report_history_organization_id ON report_history(organization_id);
CREATE INDEX idx_report_history_user_id ON report_history(user_id);
CREATE INDEX idx_report_history_created_at ON report_history(created_at DESC);
CREATE INDEX idx_report_history_status ON report_history(status);

-- Enable RLS
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view report history in their organizations" ON report_history
  FOR SELECT USING (is_member(organization_id));

CREATE POLICY "Users can create report history in their organizations" ON report_history
  FOR INSERT WITH CHECK (is_member(organization_id));

CREATE POLICY "Users can update their own report history" ON report_history
  FOR UPDATE USING (user_id = auth.uid() AND is_member(organization_id));

-- Add comment
COMMENT ON TABLE report_history IS 'Tracks generated reports for audit and history purposes';