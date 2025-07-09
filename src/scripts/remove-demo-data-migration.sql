-- Migration Script to Remove Demo Data and Add Real Database Tables
-- Run this in your Supabase SQL Editor to replace mock data with real database storage

-- 1. Create system_alerts table to replace mock alerts
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'maintenance')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN DEFAULT TRUE,
  is_dismissible BOOLEAN DEFAULT TRUE,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'admins', 'clients')),
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  dismiss_count INTEGER DEFAULT 0
);

-- 2. Create broadcasts table to replace mock broadcast history
CREATE TABLE IF NOT EXISTS broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'system')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  recipient_filter JSONB -- Store filter criteria for recipients
);

-- 3. Create security_alerts table to replace mock security data
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('failed_login', 'suspicious_activity', 'unauthorized_access', 'data_breach', 'malware_detected')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ip_address INET,
  user_id UUID REFERENCES users(id),
  user_agent TEXT,
  location TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES users(id),
  metadata JSONB -- Additional security context
);

-- 4. Create system_settings table to replace hardcoded settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
  description TEXT,
  category TEXT DEFAULT 'general',
  is_public BOOLEAN DEFAULT FALSE, -- Whether setting can be viewed by non-admins
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- 5. Create project_templates table to replace mock templates
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  default_folders TEXT[] DEFAULT '{}',
  estimated_duration INTEGER, -- in days
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0
);

-- 6. Add missing fields to users table for real user management
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE;

-- 7. Create storage_stats view for real storage statistics
CREATE OR REPLACE VIEW storage_stats AS
SELECT 
  COUNT(*) as total_files,
  COALESCE(SUM(
    CASE 
      WHEN metadata->>'size' IS NOT NULL 
      THEN (metadata->>'size')::bigint 
      ELSE 0 
    END
  ), 0) as total_size,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as files_last_30_days,
  COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '90 days') as old_files,
  COUNT(DISTINCT bucket_id) as bucket_count,
  jsonb_object_agg(
    COALESCE(metadata->>'mimetype', 'unknown'),
    COUNT(*)
  ) as file_types
FROM storage.objects
WHERE bucket_id IN ('deliverables', 'uploads');

-- 8. Create broadcast_recipients table to track individual message delivery
CREATE TABLE IF NOT EXISTS broadcast_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(broadcast_id, user_id)
);

-- 9. Create alert_dismissals table to track who dismissed which alerts
CREATE TABLE IF NOT EXISTS alert_dismissals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES system_alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(alert_id, user_id)
);

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON system_alerts(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_system_alerts_audience ON system_alerts(target_audience);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created_by ON broadcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, timestamp);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_active ON project_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON project_templates(category);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_status ON broadcast_recipients(status);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_user ON alert_dismissals(user_id);

-- 11. Enable RLS on new tables
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_dismissals ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for system_alerts
CREATE POLICY "Admins can manage all system alerts" ON system_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

CREATE POLICY "Users can view active alerts for their audience" ON system_alerts
  FOR SELECT USING (
    is_active = true
    AND (start_date IS NULL OR start_date <= NOW())
    AND (end_date IS NULL OR end_date >= NOW())
    AND (target_audience = 'all' OR
         (target_audience = 'admins' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)) OR
         (target_audience = 'clients' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = false)))
  );

-- 13. Create RLS policies for broadcasts
CREATE POLICY "Admins can manage all broadcasts" ON broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

-- 14. Create RLS policies for security_alerts
CREATE POLICY "Admins can manage all security alerts" ON security_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

-- 15. Create RLS policies for system_settings
CREATE POLICY "Admins can manage all system settings" ON system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

CREATE POLICY "Users can view public settings" ON system_settings
  FOR SELECT USING (is_public = true);

-- 16. Create RLS policies for project_templates
CREATE POLICY "Admins can manage all project templates" ON project_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

CREATE POLICY "Users can view active templates" ON project_templates
  FOR SELECT USING (is_active = true);

-- 17. Create RLS policies for broadcast_recipients
CREATE POLICY "Admins can manage broadcast recipients" ON broadcast_recipients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

CREATE POLICY "Users can view their own broadcast status" ON broadcast_recipients
  FOR SELECT USING (user_id = auth.uid());

-- 18. Create RLS policies for alert_dismissals
CREATE POLICY "Users can manage their own alert dismissals" ON alert_dismissals
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can view all alert dismissals" ON alert_dismissals
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND is_admin = true)
  );

-- 19. Insert default system settings to replace hardcoded values
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
('auto_notifications', 'true', 'boolean', 'Enable automatic notifications', 'notifications', false),
('email_notifications', 'true', 'boolean', 'Enable email notifications', 'notifications', false),
('sms_notifications', 'false', 'boolean', 'Enable SMS notifications', 'notifications', false),
('maintenance_mode', 'false', 'boolean', 'System maintenance mode', 'system', false),
('registration_enabled', 'true', 'boolean', 'Allow new user registration', 'system', true),
('max_file_size', '10', 'number', 'Maximum file size in MB', 'files', true),
('allowed_file_types', '["pdf","doc","docx","zip","rar","jpg","jpeg","png"]', 'json', 'Allowed file types for upload', 'files', true),
('session_timeout', '30', 'number', 'Session timeout in minutes', 'security', false),
('backup_frequency', 'daily', 'string', 'Backup frequency', 'system', false),
('theme_mode', 'light', 'string', 'Default theme mode', 'ui', true),
('company_name', 'Muahib Solution', 'string', 'Company name', 'company', true),
('company_email', 'info@muahibsolution.com', 'string', 'Company email', 'company', true),
('company_phone', '+234-801-234-5678', 'string', 'Company phone', 'company', true),
('support_email', 'support@muahibsolution.com', 'string', 'Support email', 'company', true),
('terms_url', '', 'string', 'Terms of service URL', 'legal', true),
('privacy_url', '', 'string', 'Privacy policy URL', 'legal', true)
ON CONFLICT (setting_key) DO NOTHING;

-- 20. Create functions for common operations
CREATE OR REPLACE FUNCTION dismiss_alert(alert_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO alert_dismissals (alert_id, user_id)
  VALUES (alert_id, user_id)
  ON CONFLICT (alert_id, user_id) DO NOTHING;

  UPDATE system_alerts
  SET dismiss_count = dismiss_count + 1
  WHERE id = alert_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION increment_alert_view(alert_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE system_alerts
  SET view_count = view_count + 1
  WHERE id = alert_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 21. Grant necessary permissions
GRANT EXECUTE ON FUNCTION dismiss_alert(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_alert_view(UUID) TO authenticated;
