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
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  X,
  Plus,
  Edit,
  Trash2,
  Send,
  Clock,
  Eye,
  EyeOff,
  Settings,
  Users,
  Globe,
  Calendar,
  RefreshCw,
  Save,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  is_active: boolean;
  is_dismissible: boolean;
  target_audience: 'all' | 'clients' | 'admins';
  start_date?: string;
  end_date?: string;
  created_at: string;
  created_by: string;
  view_count: number;
  dismiss_count: number;
}

interface NotificationSettings {
  email_alerts: boolean;
  sms_alerts: boolean;
  push_notifications: boolean;
  maintenance_notifications: boolean;
  security_alerts: boolean;
  system_updates: boolean;
  auto_dismiss_after: number; // hours
  max_alerts_per_user: number;
}

const AdminSystemAlerts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<SystemAlert | null>(null);
  const [activeTab, setActiveTab] = useState('alerts');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const [settings, setSettings] = useState<NotificationSettings>({
    email_alerts: true,
    sms_alerts: false,
    push_notifications: true,
    maintenance_notifications: true,
    security_alerts: true,
    system_updates: true,
    auto_dismiss_after: 24,
    max_alerts_per_user: 5
  });

  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    type: 'info' as SystemAlert['type'],
    priority: 'medium' as SystemAlert['priority'],
    is_dismissible: true,
    target_audience: 'all' as SystemAlert['target_audience'],
    start_date: '',
    end_date: '',
    schedule: false
  });

  // Load alerts and settings
  useEffect(() => {
    loadAlerts();
    loadSettings();
  }, []);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading alerts:', error);
        toast({
          title: "Error",
          description: "Failed to load system alerts",
          variant: "destructive",
        });
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: "Error",
        description: "Failed to load system alerts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', ['auto_notifications', 'email_notifications', 'sms_notifications']);

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      const settingsMap = (data || []).reduce((acc, setting) => {
        let value = setting.setting_value;
        if (setting.setting_type === 'boolean') {
          value = setting.setting_value === 'true';
        } else if (setting.setting_type === 'number') {
          value = parseFloat(setting.setting_value);
        }
        acc[setting.setting_key] = value;
        return acc;
      }, {} as any);

      setSettings(prev => ({ ...prev, ...settingsMap }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      const settingsToUpdate = [
        { key: 'auto_notifications', value: settings.auto_notifications.toString(), type: 'boolean' },
        { key: 'email_notifications', value: settings.email_notifications.toString(), type: 'boolean' },
        { key: 'sms_notifications', value: settings.sms_notifications.toString(), type: 'boolean' }
      ];

      for (const setting of settingsToUpdate) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: setting.key,
            setting_value: setting.value,
            setting_type: setting.type,
            updated_by: user?.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          });

        if (error) {
          console.error(`Error updating setting ${setting.key}:`, error);
          throw error;
        }
      }

      toast({
        title: "Settings Saved",
        description: "Notification settings have been updated",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const createAlert = async () => {
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newAlert, error } = await supabase
        .from('system_alerts')
        .insert({
          title: alertForm.title.trim(),
          message: alertForm.message.trim(),
          type: alertForm.type,
          priority: alertForm.priority,
          is_active: true,
          is_dismissible: alertForm.is_dismissible,
          target_audience: alertForm.target_audience,
          start_date: alertForm.start_date || new Date().toISOString(),
          end_date: alertForm.end_date || null,
          created_by: user?.full_name || 'Admin'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating alert:', error);
        toast({
          title: "Error",
          description: "Failed to create alert",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setAlerts(prev => [newAlert, ...prev]);

      // Create notifications for users based on target audience
      if (alertForm.target_audience === 'all' || alertForm.target_audience === 'clients') {
        const { data: clients } = await supabase
          .from('users')
          .select('id')
          .eq('is_admin', false);

        if (clients && clients.length > 0) {
          const notifications = clients.map(client => ({
            user_id: client.id,
            type: 'system',
            title: newAlert.title,
            message: newAlert.message,
            is_read: false
          }));

          await supabase
            .from('notifications')
            .insert(notifications);
        }
      }

      if (alertForm.target_audience === 'all' || alertForm.target_audience === 'admins') {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('is_admin', true);

        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            user_id: admin.id,
            type: 'system',
            title: newAlert.title,
            message: newAlert.message,
            is_read: false
          }));

          await supabase
            .from('notifications')
            .insert(notifications);
        }
      }

      toast({
        title: "Alert Created",
        description: "System alert has been created and sent to users",
      });

      resetForm();
      setIsCreateModalOpen(false);

    } catch (error) {
      console.error('Error creating alert:', error);
      toast({
        title: "Error",
        description: "Failed to create alert",
        variant: "destructive",
      });
    }
  };

  const updateAlert = async () => {
    if (!editingAlert) return;

    try {
      const { data: updatedAlert, error } = await supabase
        .from('system_alerts')
        .update({
          title: alertForm.title.trim(),
          message: alertForm.message.trim(),
          type: alertForm.type,
          priority: alertForm.priority,
          is_dismissible: alertForm.is_dismissible,
          target_audience: alertForm.target_audience,
          start_date: alertForm.start_date || editingAlert.start_date,
          end_date: alertForm.end_date || editingAlert.end_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingAlert.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating alert:', error);
        toast({
          title: "Error",
          description: "Failed to update alert",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setAlerts(prev => prev.map(alert =>
        alert.id === editingAlert.id ? updatedAlert : alert
      ));

      toast({
        title: "Alert Updated",
        description: "System alert has been updated successfully",
      });

      resetForm();
      setIsEditModalOpen(false);
      setEditingAlert(null);

    } catch (error) {
      console.error('Error updating alert:', error);
      toast({
        title: "Error",
        description: "Failed to update alert",
        variant: "destructive",
      });
    }
  };

  const toggleAlertStatus = async (alertId: string) => {
    try {
      const alert = alerts.find(a => a.id === alertId);
      if (!alert) return;

      const { error } = await supabase
        .from('system_alerts')
        .update({
          is_active: !alert.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        console.error('Error toggling alert status:', error);
        toast({
          title: "Error",
          description: "Failed to update alert status",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId
          ? { ...alert, is_active: !alert.is_active }
          : alert
      ));

      toast({
        title: "Alert Updated",
        description: "Alert status has been changed",
      });
    } catch (error) {
      console.error('Error toggling alert status:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .delete()
        .eq('id', alertId);

      if (error) {
        console.error('Error deleting alert:', error);
        toast({
          title: "Error",
          description: "Failed to delete alert",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));

      toast({
        title: "Alert Deleted",
        description: "System alert has been removed",
      });
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast({
        title: "Error",
        description: "Failed to delete alert",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setAlertForm({
      title: '',
      message: '',
      type: 'info',
      priority: 'medium',
      is_dismissible: true,
      target_audience: 'all',
      start_date: '',
      end_date: '',
      schedule: false
    });
  };

  const openEditModal = (alert: SystemAlert) => {
    setEditingAlert(alert);
    setAlertForm({
      title: alert.title,
      message: alert.message,
      type: alert.type,
      priority: alert.priority,
      is_dismissible: alert.is_dismissible,
      target_audience: alert.target_audience,
      start_date: alert.start_date?.split('T')[0] || '',
      end_date: alert.end_date?.split('T')[0] || '',
      schedule: false
    });
    setIsEditModalOpen(true);
  };

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'info': return <Info className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      case 'success': return <CheckCircle className="h-4 w-4" />;
      case 'maintenance': return <Settings className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: SystemAlert['type']) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'success': return 'bg-green-100 text-green-800';
      case 'maintenance': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: SystemAlert['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = filterType === 'all' || alert.type === filterType;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && alert.is_active) ||
      (filterStatus === 'inactive' && !alert.is_active);
    return matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Alerts & Notifications</h2>
          <p className="text-muted-foreground">
            Manage system-wide alerts and notification settings
          </p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Alert
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create System Alert</DialogTitle>
              <DialogDescription>
                Create a new system-wide alert or notification
              </DialogDescription>
            </DialogHeader>
            {/* Form content will be added in the next part */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="alert-title">Alert Title</Label>
                <Input
                  id="alert-title"
                  placeholder="Enter alert title"
                  value={alertForm.title}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-message">Message</Label>
                <Textarea
                  id="alert-message"
                  placeholder="Enter alert message"
                  value={alertForm.message}
                  onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="alert-type">Type</Label>
                  <Select
                    value={alertForm.type}
                    onValueChange={(value: SystemAlert['type']) =>
                      setAlertForm(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Information</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-priority">Priority</Label>
                  <Select
                    value={alertForm.priority}
                    onValueChange={(value: SystemAlert['priority']) =>
                      setAlertForm(prev => ({ ...prev, priority: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-audience">Target Audience</Label>
                <Select
                  value={alertForm.target_audience}
                  onValueChange={(value: SystemAlert['target_audience']) =>
                    setAlertForm(prev => ({ ...prev, target_audience: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="clients">Clients Only</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dismissible</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to dismiss this alert
                  </p>
                </div>
                <Switch
                  checked={alertForm.is_dismissible}
                  onCheckedChange={(checked) =>
                    setAlertForm(prev => ({ ...prev, is_dismissible: checked }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date (Optional)</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={alertForm.start_date}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date (Optional)</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={alertForm.end_date}
                    onChange={(e) => setAlertForm(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsCreateModalOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={createAlert}>
                Create Alert
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'alerts' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('alerts')}
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Active Alerts
        </Button>
        <Button
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('settings')}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filter Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                <Badge variant="secondary" className="flex items-center gap-1">
                  {filteredAlerts.length} alerts
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>
                Manage and monitor all system alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No alerts found
                  </h3>
                  <p className="text-muted-foreground">
                    {alerts.length === 0
                      ? "No system alerts have been created yet"
                      : "No alerts match your current filters"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {alert.title}
                            </h3>
                            <Badge className={getAlertColor(alert.type)}>
                              {getAlertIcon(alert.type)}
                              <span className="ml-1 capitalize">{alert.type}</span>
                            </Badge>
                            <Badge className={getPriorityColor(alert.priority)}>
                              {alert.priority.charAt(0).toUpperCase() + alert.priority.slice(1)}
                            </Badge>
                            <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                              {alert.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{alert.target_audience}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span>{alert.view_count} views</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <X className="h-3 w-3" />
                              <span>{alert.dismiss_count} dismissed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Created {new Date(alert.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={alert.is_active}
                            onCheckedChange={() => toggleAlertStatus(alert.id)}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(alert)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{alert.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteAlert(alert.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Settings
            </CardTitle>
            <CardDescription>
              Configure system notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Notification Channels</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Send alerts via email notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.email_alerts}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, email_alerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Send critical alerts via SMS
                    </p>
                  </div>
                  <Switch
                    checked={settings.sms_alerts}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, sms_alerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send browser push notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.push_notifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, push_notifications: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Alert Types</h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about scheduled maintenance
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenance_notifications}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, maintenance_notifications: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Security Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Send security-related notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.security_alerts}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, security_alerts: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify about system updates and new features
                    </p>
                  </div>
                  <Switch
                    checked={settings.system_updates}
                    onCheckedChange={(checked) =>
                      setSettings(prev => ({ ...prev, system_updates: checked }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Alert Management</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-dismiss">Auto-dismiss after (hours)</Label>
                  <Input
                    id="auto-dismiss"
                    type="number"
                    min="1"
                    max="168"
                    value={settings.auto_dismiss_after}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, auto_dismiss_after: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-alerts">Max alerts per user</Label>
                  <Input
                    id="max-alerts"
                    type="number"
                    min="1"
                    max="20"
                    value={settings.max_alerts_per_user}
                    onChange={(e) =>
                      setSettings(prev => ({ ...prev, max_alerts_per_user: parseInt(e.target.value) }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={saveSettings} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Alert Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit System Alert</DialogTitle>
            <DialogDescription>
              Update the system alert information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-alert-title">Alert Title</Label>
              <Input
                id="edit-alert-title"
                placeholder="Enter alert title"
                value={alertForm.title}
                onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-alert-message">Message</Label>
              <Textarea
                id="edit-alert-message"
                placeholder="Enter alert message"
                value={alertForm.message}
                onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-alert-type">Type</Label>
                <Select
                  value={alertForm.type}
                  onValueChange={(value: SystemAlert['type']) =>
                    setAlertForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-alert-priority">Priority</Label>
                <Select
                  value={alertForm.priority}
                  onValueChange={(value: SystemAlert['priority']) =>
                    setAlertForm(prev => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-alert-audience">Target Audience</Label>
              <Select
                value={alertForm.target_audience}
                onValueChange={(value: SystemAlert['target_audience']) =>
                  setAlertForm(prev => ({ ...prev, target_audience: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="clients">Clients Only</SelectItem>
                  <SelectItem value="admins">Admins Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Dismissible</Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to dismiss this alert
                </p>
              </div>
              <Switch
                checked={alertForm.is_dismissible}
                onCheckedChange={(checked) =>
                  setAlertForm(prev => ({ ...prev, is_dismissible: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditModalOpen(false);
                setEditingAlert(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateAlert}>
              Update Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSystemAlerts;
