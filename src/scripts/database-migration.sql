-- Database Migration Script
-- Run this in your Supabase SQL Editor to fix missing columns and issues

-- 1. Add missing columns to deliverables table
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

-- 2. Fix messages table to ensure proper UUID handling
-- First, let's check if we need to update the messages table structure
ALTER TABLE messages 
ALTER COLUMN sender_id TYPE UUID USING sender_id::UUID,
ALTER COLUMN receiver_id TYPE UUID USING receiver_id::UUID;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverables_project_id ON deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_is_sent ON deliverables(is_sent);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_project_id ON folders(project_id);
CREATE INDEX IF NOT EXISTS idx_folder_inputs_folder_id ON folder_inputs(folder_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 4. Update RLS policies for deliverables table
DROP POLICY IF EXISTS "Users can view deliverables for their projects" ON deliverables;
DROP POLICY IF EXISTS "Admins can manage all deliverables" ON deliverables;

CREATE POLICY "Users can view deliverables for their projects" ON deliverables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = deliverables.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all deliverables" ON deliverables
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- 5. Fix messages table policies to handle admin messaging
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Admins can view all messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

CREATE POLICY "Admins can send messages to any user" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- 6. Create a function to get admin user ID
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id 
  FROM users 
  WHERE is_admin = true 
  LIMIT 1;
  
  RETURN admin_id;
END;
$$;

-- 7. Create a view for easier message querying
CREATE OR REPLACE VIEW message_conversations AS
SELECT 
  m.*,
  sender.full_name as sender_name,
  sender.is_admin as sender_is_admin,
  receiver.full_name as receiver_name,
  receiver.is_admin as receiver_is_admin
FROM messages m
LEFT JOIN users sender ON m.sender_id = sender.id::uuid
LEFT JOIN users receiver ON m.receiver_id = receiver.id::uuid;

-- 8. Grant necessary permissions
GRANT SELECT ON message_conversations TO authenticated;

-- 9. Create function to send message as admin
CREATE OR REPLACE FUNCTION send_admin_message(
  receiver_user_id UUID,
  message_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_id UUID;
  message_id UUID;
BEGIN
  -- Get admin user ID
  SELECT id INTO admin_id 
  FROM users 
  WHERE is_admin = true 
  LIMIT 1;
  
  IF admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found';
  END IF;
  
  -- Insert message
  INSERT INTO messages (sender_id, receiver_id, content)
  VALUES (admin_id, receiver_user_id, message_content)
  RETURNING id INTO message_id;
  
  RETURN message_id;
END;
$$;

-- 10. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION send_admin_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_id() TO authenticated;
