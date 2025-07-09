import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Mail,
  Users,
  MessageSquare,
  FileText,
  Globe,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SystemSettings {
  auto_notifications: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  max_file_size: number;
  allowed_file_types: string[];
  session_timeout: number;
  backup_frequency: string;
  theme_mode: string;
  company_name: string;
  company_email: string;
  company_phone: string;
  support_email: string;
  terms_url: string;
  privacy_url: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'email' | 'sms' | 'system';
  is_active: boolean;
}

const AdminSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SystemSettings>({
    auto_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    maintenance_mode: false,
    registration_enabled: true,
    max_file_size: 10,
    allowed_file_types: ['pdf', 'doc', 'docx', 'zip', 'rar', 'jpg', 'jpeg', 'png'],
    session_timeout: 30,
    backup_frequency: 'daily',
    theme_mode: 'light',
    company_name: '',
    company_email: '',
    company_phone: '',
    support_email: '',
    terms_url: '',
    privacy_url: ''
  });

  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'email' as 'email' | 'sms' | 'system',
    is_active: true
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    loadNotificationTemplates();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, setting_type');

      if (error) {
        console.error('Error loading settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings",
          variant: "destructive",
        });
        return;
      }

      // Convert database settings to settings object
      const settingsMap = (data || []).reduce((acc, setting) => {
        let value = setting.setting_value;

        // Parse value based on type
        if (setting.setting_type === 'boolean') {
          value = setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(setting.setting_value);
        } else if (setting.setting_type === 'json' || setting.setting_type === 'array') {
          try {
            value = JSON.parse(setting.setting_value);
          } catch (e) {
            console.error(`Error parsing JSON for setting ${setting.setting_key}:`, e);
            value = setting.setting_value;
          }
        }

        acc[setting.setting_key] = value;
        return acc;
      }, {} as any);

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationTemplates = async () => {
    try {
      // In a real implementation, these would be loaded from database
      const defaultTemplates: NotificationTemplate[] = [
        {
          id: '1',
          name: 'Welcome Email',
          subject: 'Welcome to {{company_name}}',
          content: 'Dear {{client_name}},\n\nWelcome to our platform! We\'re excited to work with you.',
          type: 'email',
          is_active: true
        },
        {
          id: '2',
          name: 'Project Created',
          subject: 'New Project Created: {{project_name}}',
          content: 'A new project "{{project_name}}" has been created for you.',
          type: 'email',
          is_active: true
        },
        {
          id: '3',
          name: 'Deliverable Ready',
          subject: 'Deliverable Ready: {{deliverable_title}}',
          content: 'Your deliverable "{{deliverable_title}}" is ready for download.',
          type: 'email',
          is_active: true
        }
      ];
      setNotificationTemplates(defaultTemplates);
    } catch (error) {
      console.error('Error loading notification templates:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Convert settings object to database format
      const settingsToUpdate = Object.entries(settings).map(([key, value]) => {
        let settingType = 'string';
        let settingValue = String(value);

        if (typeof value === 'boolean') {
          settingType = 'boolean';
          settingValue = value.toString();
        } else if (typeof value === 'number') {
          settingType = 'number';
          settingValue = value.toString();
        } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
          settingType = Array.isArray(value) ? 'array' : 'json';
          settingValue = JSON.stringify(value);
        }

        return {
          setting_key: key,
          setting_value: settingValue,
          setting_type: settingType,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        };
      });

      // Upsert all settings
      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error(`Error updating setting ${setting.setting_key}:`, error);
          throw error;
        }
      }

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = async () => {
    try {
      // Reset to default values from database
      const defaultSettings = {
        auto_notifications: true,
        email_notifications: true,
        sms_notifications: false,
        maintenance_mode: false,
        registration_enabled: true,
        max_file_size: 10,
        allowed_file_types: ['pdf', 'doc', 'docx', 'zip', 'rar', 'jpg', 'jpeg', 'png'],
        session_timeout: 30,
        backup_frequency: 'daily',
        theme_mode: 'light',
        company_name: 'Muahib Solution',
        company_email: 'info@muahibsolution.com',
        company_phone: '+234-801-234-5678',
        support_email: 'support@muahibsolution.com',
        terms_url: '',
        privacy_url: ''
      };

      setSettings(defaultSettings);

      // Save defaults to database
      await saveSettings();

      toast({
        title: "Settings Reset",
        description: "All settings have been reset to defaults",
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast({
        title: "Error",
        description: "Failed to reset settings",
        variant: "destructive",
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `admin_settings_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Settings Exported",
      description: "Settings have been exported to JSON file",
    });
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        toast({
          title: "Settings Imported",
          description: "Settings have been imported successfully",
        });
      } catch (error) {
        toast({
          title: "Import Error",
          description: "Invalid settings file format",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const sections = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'system', name: 'System', icon: Database },
    { id: 'company', name: 'Company Info', icon: Globe },
    { id: 'templates', name: 'Templates', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Admin Settings</h2>
          <p className="text-muted-foreground">
            Configure system settings and preferences
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportSettings}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={importSettings}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Settings</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to reset all settings to their default values? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetToDefaults} className="bg-red-600 hover:bg-red-700">
                  Reset All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {section.name}
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Settings Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* General Settings */}
              {activeSection === 'general' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Basic system configuration and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="theme">Theme Mode</Label>
                        <Select
                          value={settings.theme_mode}
                          onValueChange={(value) => updateSetting('theme_mode', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                        <Input
                          id="session-timeout"
                          type="number"
                          min="5"
                          max="480"
                          value={settings.session_timeout}
                          onChange={(e) => updateSetting('session_timeout', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-file-size">Max File Size (MB)</Label>
                        <Input
                          id="max-file-size"
                          type="number"
                          min="1"
                          max="100"
                          value={settings.max_file_size}
                          onChange={(e) => updateSetting('max_file_size', parseInt(e.target.value))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="backup-frequency">Backup Frequency</Label>
                        <Select
                          value={settings.backup_frequency}
                          onValueChange={(value) => updateSetting('backup_frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">System Toggles</h4>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Temporarily disable access for maintenance
                          </p>
                        </div>
                        <Switch
                          checked={settings.maintenance_mode}
                          onCheckedChange={(checked) => updateSetting('maintenance_mode', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>User Registration</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow new users to register accounts
                          </p>
                        </div>
                        <Switch
                          checked={settings.registration_enabled}
                          onCheckedChange={(checked) => updateSetting('registration_enabled', checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Allowed File Types</h4>
                      <div className="flex flex-wrap gap-2">
                        {settings.allowed_file_types.map((type, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {type}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-transparent"
                              onClick={() => {
                                const newTypes = settings.allowed_file_types.filter((_, i) => i !== index);
                                updateSetting('allowed_file_types', newTypes);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Add file type (e.g., pdf)"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              const newType = input.value.trim().toLowerCase();
                              if (newType && !settings.allowed_file_types.includes(newType)) {
                                updateSetting('allowed_file_types', [...settings.allowed_file_types, newType]);
                                input.value = '';
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                            const newType = input?.value.trim().toLowerCase();
                            if (newType && !settings.allowed_file_types.includes(newType)) {
                              updateSetting('allowed_file_types', [...settings.allowed_file_types, newType]);
                              input.value = '';
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notification Settings */}
              {activeSection === 'notifications' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Configure how and when notifications are sent
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically send notifications for system events
                          </p>
                        </div>
                        <Switch
                          checked={settings.auto_notifications}
                          onCheckedChange={(checked) => updateSetting('auto_notifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={settings.email_notifications}
                          onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Send notifications via SMS (requires SMS service)
                          </p>
                        </div>
                        <Switch
                          checked={settings.sms_notifications}
                          onCheckedChange={(checked) => updateSetting('sms_notifications', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Security Settings */}
              {activeSection === 'security' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Manage security policies and access controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <div className="flex gap-2">
                          <Input
                            type={showApiKey ? 'text' : 'password'}
                            value="sk-1234567890abcdef"
                            readOnly
                            className="font-mono"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" size="sm">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          API key for external integrations and webhooks
                        </p>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Security Policies</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Password Min Length</Label>
                            <Input type="number" min="6" max="32" defaultValue="8" />
                          </div>

                          <div className="space-y-2">
                            <Label>Max Login Attempts</Label>
                            <Input type="number" min="3" max="10" defaultValue="5" />
                          </div>

                          <div className="space-y-2">
                            <Label>Account Lockout Duration (minutes)</Label>
                            <Input type="number" min="5" max="60" defaultValue="15" />
                          </div>

                          <div className="space-y-2">
                            <Label>Two-Factor Authentication</Label>
                            <Select defaultValue="optional">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="disabled">Disabled</SelectItem>
                                <SelectItem value="optional">Optional</SelectItem>
                                <SelectItem value="required">Required</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium">Access Control</h4>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>IP Whitelist</Label>
                              <p className="text-sm text-muted-foreground">
                                Restrict admin access to specific IP addresses
                              </p>
                            </div>
                            <Switch defaultChecked={false} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Audit Logging</Label>
                              <p className="text-sm text-muted-foreground">
                                Log all admin actions for security auditing
                              </p>
                            </div>
                            <Switch defaultChecked={true} />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Force HTTPS</Label>
                              <p className="text-sm text-muted-foreground">
                                Redirect all HTTP traffic to HTTPS
                              </p>
                            </div>
                            <Switch defaultChecked={true} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Company Info Settings */}
              {activeSection === 'company' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Company Information
                    </CardTitle>
                    <CardDescription>
                      Update company details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="company-name">Company Name</Label>
                        <Input
                          id="company-name"
                          value={settings.company_name}
                          onChange={(e) => updateSetting('company_name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company-email">Company Email</Label>
                        <Input
                          id="company-email"
                          type="email"
                          value={settings.company_email}
                          onChange={(e) => updateSetting('company_email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company-phone">Company Phone</Label>
                        <Input
                          id="company-phone"
                          value={settings.company_phone}
                          onChange={(e) => updateSetting('company_phone', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="support-email">Support Email</Label>
                        <Input
                          id="support-email"
                          type="email"
                          value={settings.support_email}
                          onChange={(e) => updateSetting('support_email', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="terms-url">Terms of Service URL</Label>
                        <Input
                          id="terms-url"
                          type="url"
                          placeholder="https://example.com/terms"
                          value={settings.terms_url}
                          onChange={(e) => updateSetting('terms_url', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="privacy-url">Privacy Policy URL</Label>
                        <Input
                          id="privacy-url"
                          type="url"
                          placeholder="https://example.com/privacy"
                          value={settings.privacy_url}
                          onChange={(e) => updateSetting('privacy_url', e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
