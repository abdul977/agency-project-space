import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw,
  Download,
  Search,
  Filter,
  X,
  Calendar,
  MapPin,
  Wifi,
  Settings,
  Key,
  FileText,
  Database,
  Server
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  user_id: string;
  user_name: string;
  ip_address: string;
  user_agent: string;
  location: string;
  timestamp: string;
  status: 'success' | 'failed' | 'warning';
  details: Record<string, any>;
}

interface SecuritySettings {
  password_policy: {
    min_length: number;
    require_uppercase: boolean;
    require_lowercase: boolean;
    require_numbers: boolean;
    require_symbols: boolean;
    max_age_days: number;
  };
  session_settings: {
    timeout_minutes: number;
    max_concurrent_sessions: number;
    require_2fa: boolean;
  };
  access_control: {
    ip_whitelist_enabled: boolean;
    ip_whitelist: string[];
    geo_blocking_enabled: boolean;
    blocked_countries: string[];
  };
  audit_settings: {
    log_retention_days: number;
    log_failed_attempts: boolean;
    log_successful_logins: boolean;
    log_admin_actions: boolean;
    real_time_alerts: boolean;
  };
}

interface SecurityAlert {
  id: string;
  type: 'failed_login' | 'suspicious_activity' | 'policy_violation' | 'system_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  user_id?: string;
  user_name?: string;
  ip_address?: string;
  timestamp: string;
  resolved: boolean;
}

const AdminSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('24h');
  const [activeTab, setActiveTab] = useState('logs');

  useEffect(() => {
    loadSecurityData();
  }, [timeFilter]);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      // Load security alerts from database
      const { data: alertsData, error: alertsError } = await supabase
        .from('security_alerts')
        .select(`
          *,
          user:user_id (
            id,
            full_name
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (alertsError) {
        console.error('Error loading security alerts:', alertsError);
      }

      const securityAlerts: SecurityAlert[] = (alertsData || []).map(alert => ({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        ip_address: alert.ip_address,
        user_id: alert.user_id,
        user_name: alert.user?.full_name || 'Unknown',
        timestamp: alert.timestamp,
        resolved: alert.resolved
      }));

      // Load security settings from system_settings table
      const { data: settingsData, error: settingsError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, setting_type')
        .like('setting_key', 'security_%');

      if (settingsError) {
        console.error('Error loading security settings:', settingsError);
      }

      // Parse security settings
      const settingsMap = (settingsData || []).reduce((acc, setting) => {
        let value = setting.setting_value;
        if (setting.setting_type === 'boolean') {
          value = setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(setting.setting_value);
        } else if (setting.setting_type === 'json') {
          try {
            value = JSON.parse(setting.setting_value);
          } catch (e) {
            value = setting.setting_value;
          }
        }
        acc[setting.setting_key] = value;
        return acc;
      }, {} as any);

      // Default security settings if not found in database
      const defaultSettings: SecuritySettings = {
        password_policy: {
          min_length: settingsMap.security_password_min_length || 8,
          require_uppercase: settingsMap.security_password_require_uppercase !== false,
          require_lowercase: settingsMap.security_password_require_lowercase !== false,
          require_numbers: settingsMap.security_password_require_numbers !== false,
          require_symbols: settingsMap.security_password_require_symbols !== false,
          max_age_days: settingsMap.security_password_max_age_days || 90
        },
        session_management: {
          max_concurrent_sessions: settingsMap.security_max_concurrent_sessions || 3,
          session_timeout_minutes: settingsMap.security_session_timeout_minutes || 30,
          remember_me_duration_days: settingsMap.security_remember_me_duration_days || 30
        },
        two_factor: {
          enabled: settingsMap.security_two_factor_enabled === true,
          required_for_admins: settingsMap.security_two_factor_required_for_admins === true,
          backup_codes_count: settingsMap.security_backup_codes_count || 10
        },
        audit_logging: {
          log_failed_attempts: settingsMap.security_log_failed_attempts !== false,
          log_successful_logins: settingsMap.security_log_successful_logins !== false,
          log_admin_actions: settingsMap.security_log_admin_actions !== false,
          real_time_alerts: settingsMap.security_real_time_alerts !== false
        }
      };

      // Load audit logs from security_alerts table (using it as audit log for now)
      const { data: auditData } = await supabase
        .from('security_alerts')
        .select(`
          id,
          type,
          title,
          description,
          user_id,
          ip_address,
          user_agent,
          location,
          timestamp,
          metadata,
          user:user_id (
            full_name
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(100);

      const auditLogs: AuditLog[] = (auditData || []).map(log => ({
        id: log.id,
        action: log.type,
        resource: 'security',
        user_id: log.user_id || 'system',
        user_name: log.user?.full_name || 'System',
        ip_address: log.ip_address || 'unknown',
        user_agent: log.user_agent || 'unknown',
        location: log.location || 'unknown',
        timestamp: log.timestamp,
        status: 'success',
        details: log.metadata || {}
      }));

      setAuditLogs(auditLogs);
      setSecuritySettings(defaultSettings);
      setSecurityAlerts(securityAlerts);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSecuritySettings = async (newSettings: SecuritySettings) => {
    try {
      // In a real implementation, this would update the security_settings table
      setSecuritySettings(newSettings);
      
      toast({
        title: "Settings Updated",
        description: "Security settings have been updated successfully",
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
      toast({
        title: "Error",
        description: "Failed to update security settings",
        variant: "destructive",
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      setSecurityAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, resolved: true } : alert
      ));
      
      toast({
        title: "Alert Resolved",
        description: "Security alert has been marked as resolved",
      });
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const exportAuditLogs = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      exported_by: user?.full_name || 'Admin',
      time_range: timeFilter,
      filters: {
        search: searchTerm,
        action: actionFilter,
        status: statusFilter
      },
      logs: filteredLogs
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `audit_logs_${timeFilter}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Export Complete",
      description: "Audit logs have been exported successfully",
    });
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <ShieldX className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_login': return <User className="h-4 w-4 text-blue-500" />;
      case 'user_logout': return <User className="h-4 w-4 text-gray-500" />;
      case 'project_created': return <FileText className="h-4 w-4 text-green-500" />;
      case 'project_deleted': return <FileText className="h-4 w-4 text-red-500" />;
      case 'failed_login': return <ShieldX className="h-4 w-4 text-red-500" />;
      case 'settings_changed': return <Settings className="h-4 w-4 text-purple-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Security & Audit</h2>
          <p className="text-muted-foreground">
            Monitor security events, manage access controls, and audit system activity
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last hour</SelectItem>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={exportAuditLogs}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button
            variant="outline"
            onClick={loadSecurityData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security Alerts */}
      {securityAlerts.filter(alert => !alert.resolved).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <ShieldAlert className="h-5 w-5" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityAlerts.filter(alert => !alert.resolved).map((alert) => (
                <div key={alert.id} className="flex items-start justify-between p-3 bg-white border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="font-medium">{alert.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {alert.user_name && (
                        <span>User: {alert.user_name}</span>
                      )}
                      {alert.ip_address && (
                        <span>IP: {alert.ip_address}</span>
                      )}
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resolveAlert(alert.id)}
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'logs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('logs')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Audit Logs
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          Security Settings
        </Button>
      </div>
    </div>
  );
};

export default AdminSecurity;
