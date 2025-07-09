import { supabase } from '@/integrations/supabase/client';

// Security utilities for data access control
export class SecurityManager {
  
  // Check if user has access to a specific project
  static async canAccessProject(userId: string, projectId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.user_id === userId;
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

  // Check if user has access to a specific folder
  static async canAccessFolder(userId: string, folderId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('folders')
        .select(`
          project_id,
          projects!inner(user_id)
        `)
        .eq('id', folderId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.projects.user_id === userId;
    } catch (error) {
      console.error('Error checking folder access:', error);
      return false;
    }
  }

  // Check if user is admin
  static async isAdmin(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.is_admin === true;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if user can access a deliverable
  static async canAccessDeliverable(userId: string, deliverableId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select(`
          id,
          projects!inner(user_id)
        `)
        .eq('id', deliverableId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.projects.user_id === userId;
    } catch (error) {
      console.error('Error checking deliverable access:', error);
      return false;
    }
  }

  // Check if user can delete a deliverable (must be owner or admin)
  static async canDeleteDeliverable(userId: string, deliverableId: string): Promise<boolean> {
    try {
      // Check if user is admin
      const isAdminUser = await this.isAdmin(userId);
      if (isAdminUser) return true;

      // Check if user owns the deliverable
      return await this.canAccessDeliverable(userId, deliverableId);
    } catch (error) {
      console.error('Error checking deliverable delete permission:', error);
      return false;
    }
  }

  // Check if user can delete a project (must be owner or admin)
  static async canDeleteProject(userId: string, projectId: string): Promise<boolean> {
    try {
      // Check if user is admin
      const isAdminUser = await this.isAdmin(userId);
      if (isAdminUser) return true;

      // Check if user owns the project
      return await this.canAccessProject(userId, projectId);
    } catch (error) {
      console.error('Error checking project delete permission:', error);
      return false;
    }
  }

  // Rate limiting for downloads
  private static downloadAttempts = new Map<string, { count: number; lastAttempt: number }>();
  private static readonly DOWNLOAD_RATE_LIMIT = 10; // Max downloads per minute
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds

  static checkDownloadRateLimit(userId: string): boolean {
    const now = Date.now();
    const userAttempts = this.downloadAttempts.get(userId);

    if (!userAttempts) {
      this.downloadAttempts.set(userId, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset count if window has passed
    if (now - userAttempts.lastAttempt > this.RATE_LIMIT_WINDOW) {
      this.downloadAttempts.set(userId, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if under rate limit
    if (userAttempts.count < this.DOWNLOAD_RATE_LIMIT) {
      userAttempts.count++;
      userAttempts.lastAttempt = now;
      return true;
    }

    return false;
  }

  // Validate file upload security
  static validateFileUpload(file: File): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    if (file.size > maxSize) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.php$/i,
      /\.asp$/i,
      /\.jsp$/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return { valid: false, error: 'File type not allowed for security reasons' };
    }

    return { valid: true };
  }

  // Sanitize user input to prevent XSS
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  // Validate URL input
  static validateUrl(url: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);

      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }

      // Block localhost and private IP ranges for security
      const hostname = urlObj.hostname.toLowerCase();
      if (hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')) {
        return { valid: false, error: 'Private network URLs are not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  // Validate phone number format
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+234[789][01]\d{8}$/;
    return phoneRegex.test(phone);
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Rate limiting check (simple implementation)
  static checkRateLimit(userId: string, action: string, maxAttempts: number = 5, windowMs: number = 300000): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    // Get stored attempts from localStorage (in production, use Redis)
    const stored = localStorage.getItem(`rateLimit:${key}`);
    let attempts: number[] = stored ? JSON.parse(stored) : [];
    
    // Remove old attempts outside the window
    attempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    // Check if limit exceeded
    if (attempts.length >= maxAttempts) {
      return false;
    }
    
    // Add current attempt
    attempts.push(now);
    localStorage.setItem(`rateLimit:${key}`, JSON.stringify(attempts));
    
    return true;
  }

  // Validate file upload
  static validateFileUpload(file: File, allowedTypes: string[], maxSizeMB: number): { isValid: boolean; error?: string } {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    // Check file type
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('*')) {
        return file.type.startsWith(type.replace('*', ''));
      }
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });

    if (!isAllowed) {
      return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
    }

    return { isValid: true };
  }

  // Generate secure random string
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Log security events
  static async logSecurityEvent(userId: string, event: string, details: any = {}): Promise<void> {
    try {
      // In production, this would log to a security monitoring system
      console.log('Security Event:', {
        userId,
        event,
        details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: 'client-side' // In production, get from server
      });

      // Could also store in database for audit trail
      // await supabase.from('security_logs').insert({...});
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

// SQL for Row Level Security policies (to be run in Supabase SQL editor)
export const RLS_POLICIES = `
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE folder_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid()::text = id OR is_admin = true);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Projects table policies
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can view all projects" ON projects
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Folders table policies
CREATE POLICY "Users can access folders in their projects" ON folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = folders.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can access all folders" ON folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Folder inputs table policies
CREATE POLICY "Users can access inputs in their folders" ON folder_inputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM folders 
      JOIN projects ON projects.id = folders.project_id
      WHERE folders.id = folder_inputs.folder_id 
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can access all folder inputs" ON folder_inputs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Messages table policies
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    sender_id = auth.uid()::text OR receiver_id = auth.uid()::text
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid()::text);

CREATE POLICY "Admins can view all messages" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Notifications table policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );

-- Deliverables table policies
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

-- File uploads table policies
CREATE POLICY "Users can view files for their projects" ON file_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = file_uploads.project_id 
      AND projects.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Admins can manage all file uploads" ON file_uploads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_admin = true
    )
  );
`;

export default SecurityManager;
