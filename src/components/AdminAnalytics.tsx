import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FolderOpen,
  Clock,
  Download,
  Calendar,
  Activity,
  Database,
  FileText,
  Globe,
  RefreshCw,
  Eye,
  MessageSquare,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  totalUsers: number;
  totalProjects: number;
  totalDeliverables: number;
  activeUsers: number;
  completedProjects: number;
  storageUsed: number;
  userGrowth: number;
  projectGrowth: number;
  avgProjectDuration: number;
  topClients: Array<{
    id: string;
    name: string;
    projects: number;
    lastActive: string;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'user_created' | 'project_created' | 'deliverable_sent' | 'login';
    description: string;
    timestamp: string;
    user: string;
  }>;
  monthlyStats: Array<{
    month: string;
    users: number;
    projects: number;
    deliverables: number;
  }>;
}

const AdminAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Calculate date range for analytics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get total users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, created_at, last_login, is_admin');

      if (usersError) throw usersError;

      // Get total projects with status
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, status, created_at, updated_at, user_id');

      if (projectsError) throw projectsError;

      // Get total deliverables
      const { data: deliverables, error: deliverablesError } = await supabase
        .from('deliverables')
        .select('id, created_at, is_sent');

      if (deliverablesError) throw deliverablesError;

      // Calculate real analytics
      const totalUsers = users?.length || 0;
      const totalProjects = projects?.length || 0;
      const totalDeliverables = deliverables?.length || 0;

      // Calculate active users (logged in within last 30 days)
      const activeUsers = users?.filter(user =>
        user.last_login && new Date(user.last_login) > thirtyDaysAgo
      ).length || 0;

      // Calculate completed projects
      const completedProjects = projects?.filter(project =>
        project.status === 'completed'
      ).length || 0;

      // Calculate user growth (new users in last 30 days vs previous 30 days)
      const newUsersLast30Days = users?.filter(user =>
        new Date(user.created_at) > thirtyDaysAgo
      ).length || 0;
      const newUsersPrevious30Days = users?.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo;
      }).length || 0;
      const userGrowth = newUsersPrevious30Days > 0
        ? ((newUsersLast30Days - newUsersPrevious30Days) / newUsersPrevious30Days) * 100
        : newUsersLast30Days > 0 ? 100 : 0;

      // Calculate project growth
      const newProjectsLast30Days = projects?.filter(project =>
        new Date(project.created_at) > thirtyDaysAgo
      ).length || 0;
      const newProjectsPrevious30Days = projects?.filter(project => {
        const createdAt = new Date(project.created_at);
        return createdAt > sixtyDaysAgo && createdAt <= thirtyDaysAgo;
      }).length || 0;
      const projectGrowth = newProjectsPrevious30Days > 0
        ? ((newProjectsLast30Days - newProjectsPrevious30Days) / newProjectsPrevious30Days) * 100
        : newProjectsLast30Days > 0 ? 100 : 0;

      // Calculate average project duration for completed projects
      const completedProjectsWithDuration = projects?.filter(project =>
        project.status === 'completed' && project.updated_at
      ) || [];
      const avgProjectDuration = completedProjectsWithDuration.length > 0
        ? completedProjectsWithDuration.reduce((sum, project) => {
            const duration = (new Date(project.updated_at).getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24);
            return sum + duration;
          }, 0) / completedProjectsWithDuration.length
        : 0;

      // Get top clients by project count
      const clientProjectCounts = projects?.reduce((acc, project) => {
        acc[project.user_id] = (acc[project.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const topClients = users?.filter(user => !user.is_admin)
        .map(user => ({
          id: user.id,
          name: user.full_name || 'Unknown',
          projects: clientProjectCounts[user.id] || 0,
          lastActive: user.last_login || user.created_at
        }))
        .sort((a, b) => b.projects - a.projects)
        .slice(0, 5) || [];

      // Get storage usage from storage_stats view
      const { data: storageStats } = await supabase
        .from('storage_stats')
        .select('*')
        .single();

      const storageUsed = storageStats?.total_size ? storageStats.total_size / (1024 * 1024 * 1024) : 0; // Convert to GB

      // Generate recent activity from actual data
      const recentActivity = [];

      // Add recent user registrations
      const recentUsers = users?.filter(user =>
        new Date(user.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      ).slice(0, 3) || [];

      recentUsers.forEach(user => {
        recentActivity.push({
          id: `user_${user.id}`,
          type: 'user_created',
          description: 'New user registered',
          timestamp: user.created_at,
          user: user.full_name || 'Unknown'
        });
      });

      // Add recent projects
      const recentProjects = projects?.filter(project =>
        new Date(project.created_at) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      ).slice(0, 3) || [];

      recentProjects.forEach(project => {
        const user = users?.find(u => u.id === project.user_id);
        recentActivity.push({
          id: `project_${project.id}`,
          type: 'project_created',
          description: 'New project created',
          timestamp: project.created_at,
          user: user?.full_name || 'Unknown'
        });
      });

      // Sort by timestamp and take most recent
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Generate monthly stats for the last 6 months
      const monthlyStats = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthUsers = users?.filter(user => {
          const createdAt = new Date(user.created_at);
          return createdAt >= monthDate && createdAt < nextMonthDate;
        }).length || 0;

        const monthProjects = projects?.filter(project => {
          const createdAt = new Date(project.created_at);
          return createdAt >= monthDate && createdAt < nextMonthDate;
        }).length || 0;

        const monthDeliverables = deliverables?.filter(deliverable => {
          const createdAt = new Date(deliverable.created_at);
          return createdAt >= monthDate && createdAt < nextMonthDate;
        }).length || 0;

        monthlyStats.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          users: monthUsers,
          projects: monthProjects,
          deliverables: monthDeliverables
        });
      }

      const realAnalytics: AnalyticsData = {
        totalUsers,
        totalProjects,
        totalDeliverables,
        activeUsers,
        completedProjects,
        storageUsed,
        userGrowth,
        projectGrowth,
        avgProjectDuration: Math.round(avgProjectDuration),
        topClients,
        recentActivity: recentActivity.slice(0, 10),
        monthlyStats
      };

      setAnalytics(realAnalytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = () => {
    if (!analytics) return;

    const reportData = {
      generated_at: new Date().toISOString(),
      generated_by: user?.full_name || 'Admin',
      time_range: timeRange,
      summary: {
        total_users: analytics.totalUsers,
        total_projects: analytics.totalProjects,
        total_deliverables: analytics.totalDeliverables,
        active_users: analytics.activeUsers,
        completed_projects: analytics.completedProjects,
        storage_used_gb: analytics.storageUsed,
        user_growth_percent: analytics.userGrowth,
        project_growth_percent: analytics.projectGrowth,
        avg_project_duration_days: analytics.avgProjectDuration
      },
      top_clients: analytics.topClients,
      recent_activity: analytics.recentActivity,
      monthly_statistics: analytics.monthlyStats
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `analytics_report_${timeRange}_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Report Exported",
      description: "Analytics report has been exported successfully",
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_created': return <Users className="h-4 w-4 text-blue-500" />;
      case 'project_created': return <FolderOpen className="h-4 w-4 text-green-500" />;
      case 'deliverable_sent': return <FileText className="h-4 w-4 text-purple-500" />;
      case 'login': return <Activity className="h-4 w-4 text-orange-500" />;
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

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No analytics data available
        </h3>
        <p className="text-muted-foreground">
          Analytics data will appear here once there's activity in the system
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into system usage and performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={exportReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          
          <Button
            variant="outline"
            onClick={loadAnalytics}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('overview')}
          className="flex items-center gap-2"
        >
          <BarChart3 className="h-4 w-4" />
          Overview
        </Button>
        <Button
          variant={activeTab === 'activity' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('activity')}
          className="flex items-center gap-2"
        >
          <Activity className="h-4 w-4" />
          Activity
        </Button>
        <Button
          variant={activeTab === 'performance' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('performance')}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4" />
          Performance
        </Button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{analytics.userGrowth}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalProjects}</p>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                  </div>
                  <FolderOpen className="h-8 w-8 text-green-600" />
                </div>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+{analytics.projectGrowth}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.totalDeliverables}</p>
                    <p className="text-sm text-muted-foreground">Deliverables</p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-600" />
                </div>
                <div className="flex items-center mt-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">All delivered</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{analytics.storageUsed} GB</p>
                    <p className="text-sm text-muted-foreground">Storage Used</p>
                  </div>
                  <Database className="h-8 w-8 text-orange-600" />
                </div>
                <div className="flex items-center mt-2">
                  <Globe className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">8.8 GB available</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients</CardTitle>
              <CardDescription>
                Most active clients by project count
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topClients.map((client, index) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last active: {new Date(client.lastActive).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {client.projects} projects
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest system activities and user actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-muted-foreground">
                      by {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Performance</CardTitle>
              <CardDescription>
                Key performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Active Users</span>
                <Badge className="bg-green-100 text-green-800">
                  {analytics.activeUsers}/{analytics.totalUsers}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Project Completion Rate</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {Math.round((analytics.completedProjects / analytics.totalProjects) * 100)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Avg Project Duration</span>
                <Badge variant="outline">
                  {analytics.avgProjectDuration} days
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
              <CardDescription>
                Growth trends over the last 6 months
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.monthlyStats.map((stat) => (
                  <div key={stat.month} className="flex items-center justify-between">
                    <span className="font-medium">{stat.month}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {stat.users}U
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stat.projects}P
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stat.deliverables}D
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminAnalytics;
