import { supabase } from '@/integrations/supabase/client';

export interface SecurityEvent {
  type: 'failed_login' | 'suspicious_activity' | 'unauthorized_access' | 'data_breach' | 'malware_detected';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  ip_address?: string;
  user_id?: string;
  user_agent?: string;
  location?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a security event to the database
 */
export const logSecurityEvent = async (event: SecurityEvent) => {
  try {
    const { data, error } = await supabase
      .from('security_alerts')
      .insert({
        type: event.type,
        severity: event.severity,
        title: event.title,
        description: event.description,
        ip_address: event.ip_address,
        user_id: event.user_id,
        user_agent: event.user_agent,
        location: event.location,
        metadata: event.metadata,
        resolved: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging security event:', error);
      return { success: false, error };
    }

    // If it's a critical or high severity event, create a system alert
    if (event.severity === 'critical' || event.severity === 'high') {
      await createSystemAlert(event);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error logging security event:', error);
    return { success: false, error };
  }
};

/**
 * Create a system alert for high-severity security events
 */
const createSystemAlert = async (event: SecurityEvent) => {
  try {
    await supabase
      .from('system_alerts')
      .insert({
        title: `Security Alert: ${event.title}`,
        message: event.description,
        type: 'error',
        priority: event.severity === 'critical' ? 'critical' : 'high',
        is_active: true,
        is_dismissible: true,
        target_audience: 'admins',
        created_by: 'Security System'
      });
  } catch (error) {
    console.error('Error creating system alert for security event:', error);
  }
};

/**
 * Track failed login attempts
 */
export const trackFailedLogin = async (phoneNumber: string, ipAddress?: string, userAgent?: string) => {
  try {
    // Get user info if exists
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, login_attempts')
      .eq('phone_number', phoneNumber)
      .single();

    if (user) {
      // Increment login attempts
      const newAttempts = (user.login_attempts || 0) + 1;
      
      await supabase
        .from('users')
        .update({ 
          login_attempts: newAttempts,
          // Lock account after 5 failed attempts for 30 minutes
          locked_until: newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null
        })
        .eq('id', user.id);

      // Log security event
      await logSecurityEvent({
        type: 'failed_login',
        severity: newAttempts >= 5 ? 'high' : newAttempts >= 3 ? 'medium' : 'low',
        title: 'Failed Login Attempt',
        description: `Failed login attempt for user ${user.full_name} (${phoneNumber}). Attempt ${newAttempts}/5.`,
        ip_address: ipAddress,
        user_id: user.id,
        user_agent: userAgent,
        metadata: { attempts: newAttempts, phone_number: phoneNumber }
      });

      return { success: true, attempts: newAttempts, locked: newAttempts >= 5 };
    } else {
      // Log failed login for non-existent user
      await logSecurityEvent({
        type: 'failed_login',
        severity: 'medium',
        title: 'Failed Login - Invalid User',
        description: `Failed login attempt for non-existent phone number: ${phoneNumber}`,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { phone_number: phoneNumber }
      });

      return { success: true, attempts: 1, locked: false };
    }
  } catch (error) {
    console.error('Error tracking failed login:', error);
    return { success: false, error };
  }
};

/**
 * Track successful login and reset failed attempts
 */
export const trackSuccessfulLogin = async (userId: string, ipAddress?: string, userAgent?: string) => {
  try {
    // Reset login attempts and update last login
    await supabase
      .from('users')
      .update({ 
        login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString()
      })
      .eq('id', userId);

    // Get user info for logging
    const { data: user } = await supabase
      .from('users')
      .select('full_name, phone_number')
      .eq('id', userId)
      .single();

    // Log successful login (for audit purposes)
    await logSecurityEvent({
      type: 'suspicious_activity', // Using this type for audit logs
      severity: 'low',
      title: 'Successful Login',
      description: `User ${user?.full_name} logged in successfully`,
      ip_address: ipAddress,
      user_id: userId,
      user_agent: userAgent,
      metadata: { event_type: 'successful_login' }
    });

    return { success: true };
  } catch (error) {
    console.error('Error tracking successful login:', error);
    return { success: false, error };
  }
};

/**
 * Detect suspicious activity patterns
 */
export const detectSuspiciousActivity = async (userId: string, ipAddress?: string, userAgent?: string) => {
  try {
    // Check for multiple logins from different IPs in short time
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentLogins } = await supabase
      .from('security_alerts')
      .select('ip_address, metadata')
      .eq('user_id', userId)
      .gte('timestamp', oneHourAgo)
      .eq('type', 'suspicious_activity');

    if (recentLogins && recentLogins.length > 0) {
      const uniqueIPs = new Set(recentLogins.map(login => login.ip_address).filter(Boolean));
      
      if (uniqueIPs.size > 2 && ipAddress && !uniqueIPs.has(ipAddress)) {
        // Multiple IPs detected - suspicious activity
        const { data: user } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', userId)
          .single();

        await logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          title: 'Unusual Access Pattern Detected',
          description: `User ${user?.full_name} is accessing the system from multiple IP addresses within a short time period`,
          ip_address: ipAddress,
          user_id: userId,
          user_agent: userAgent,
          metadata: { 
            unique_ips: Array.from(uniqueIPs),
            current_ip: ipAddress,
            detection_reason: 'multiple_ips_short_time'
          }
        });

        return { suspicious: true, reason: 'multiple_ips' };
      }
    }

    return { suspicious: false };
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return { suspicious: false, error };
  }
};

/**
 * Resolve a security alert
 */
export const resolveSecurityAlert = async (alertId: string, resolvedBy: string) => {
  try {
    const { error } = await supabase
      .from('security_alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', alertId);

    if (error) {
      console.error('Error resolving security alert:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resolving security alert:', error);
    return { success: false, error };
  }
};

/**
 * Get security statistics
 */
export const getSecurityStats = async () => {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get alert counts by severity
    const { data: alerts } = await supabase
      .from('security_alerts')
      .select('severity, resolved')
      .gte('timestamp', oneWeekAgo);

    const stats = {
      total_alerts: alerts?.length || 0,
      critical_alerts: alerts?.filter(a => a.severity === 'critical').length || 0,
      high_alerts: alerts?.filter(a => a.severity === 'high').length || 0,
      medium_alerts: alerts?.filter(a => a.severity === 'medium').length || 0,
      low_alerts: alerts?.filter(a => a.severity === 'low').length || 0,
      resolved_alerts: alerts?.filter(a => a.resolved).length || 0,
      unresolved_alerts: alerts?.filter(a => !a.resolved).length || 0
    };

    return { success: true, stats };
  } catch (error) {
    console.error('Error getting security stats:', error);
    return { success: false, error };
  }
};
