import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  FolderOpen, 
  MessageSquare, 
  Bell, 
  Settings, 
  LogOut,
  Search,
  Filter,
  Eye,
  Calendar,
  Building2,
  Phone,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import NotificationDropdown from "@/components/NotificationDropdown";
import AdminMessaging from "@/components/AdminMessaging";

interface ClientData {
  id: string;
  phone_number: string;
  full_name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  project_count: number;
  latest_activity: string;
  has_new_content: boolean;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
    updated_at: string;
  }>;
}

interface DashboardStats {
  total_clients: number;
  active_projects: number;
  completed_projects: number;
  new_messages: number;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<ClientData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total_clients: 0,
    active_projects: 0,
    completed_projects: 0,
    new_messages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch clients with project counts
        const { data: clientsData, error: clientsError } = await supabase
          .from('users')
          .select(`
            id,
            phone_number,
            full_name,
            company_name,
            created_at,
            updated_at,
            projects (
              id,
              name,
              status,
              updated_at
            )
          `)
          .eq('is_admin', false)
          .order('updated_at', { ascending: false });

        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
          toast({
            title: "Error",
            description: "Failed to load client data",
            variant: "destructive",
          });
        } else {
          const processedClients = clientsData?.map((client: any) => ({
            id: client.id,
            phone_number: client.phone_number,
            full_name: client.full_name,
            company_name: client.company_name,
            created_at: client.created_at,
            updated_at: client.updated_at,
            projects: client.projects || [],
            project_count: client.projects?.length || 0,
            latest_activity: client.projects?.length > 0 
              ? new Date(Math.max(...client.projects.map((p: any) => new Date(p.updated_at || p.created_at).getTime()))).toISOString()
              : client.updated_at || client.created_at,
            has_new_content: client.projects?.some((p: any) => 
              new Date(p.updated_at || p.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
            ) || false
          })) || [];
          
          setClients(processedClients);

          // Calculate stats
          const totalClients = processedClients.length;
          const activeProjects = processedClients.reduce((sum, client) => 
            sum + (client.projects?.filter((p: any) => p.status === 'in_progress').length || 0), 0
          );
          const completedProjects = processedClients.reduce((sum, client) => 
            sum + (client.projects?.filter((p: any) => p.status === 'completed').length || 0), 0
          );

          setStats({
            total_clients: totalClients,
            active_projects: activeProjects,
            completed_projects: completedProjects,
            new_messages: 0 // TODO: Implement message counting
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone_number.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-light bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                Muahib Solution
              </h1>
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                Admin Panel
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <NotificationDropdown />
              
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.full_name ? getInitials(user.full_name) : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-foreground">
                    {user?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        <div className="grid lg:grid-cols-4 gap-4 lg:gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border-border-light">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Admin Menu</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Overview
                </Button>
                
                <Button
                  variant={activeTab === 'clients' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('clients')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Clients
                </Button>
                
                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('projects')}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Projects
                </Button>
                
                <Button
                  variant={activeTab === 'messages' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>
                
                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 min-w-0 overflow-x-hidden">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                  <p className="text-muted-foreground">
                    Monitor your client management system performance
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-border-light">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.total_clients}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Total Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.active_projects}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Active Projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.completed_projects}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xl sm:text-2xl font-bold text-foreground">{stats.new_messages}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">New Messages</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card className="border-border-light">
                  <CardHeader>
                    <CardTitle>Recent Client Activity</CardTitle>
                    <CardDescription>
                      Latest updates from your clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clients.slice(0, 5).map((client) => (
                        <div key={client.id} className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-wrap">
                                {client.full_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-muted-foreground text-wrap">
                                {client.company_name} • {client.project_count} projects
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                            {client.has_new_content && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                NEW
                              </Badge>
                            )}
                            <Button variant="outline" size="sm" asChild className="flex-shrink-0">
                              <Link to={`/admin/client/${client.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Client Management</h2>
                    <p className="text-muted-foreground">
                      View and manage all registered clients
                    </p>
                  </div>
                </div>

                {/* Search and Filter */}
                <Card className="border-border-light">
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search clients by name, company, or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Clients Table */}
                <Card className="border-border-light">
                  <CardHeader>
                    <CardTitle>All Clients ({filteredClients.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredClients.map((client) => (
                        <div key={client.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border border-border-light rounded-lg gap-4">
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 min-w-0 flex-1">
                            <Avatar className="h-12 w-12 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground text-wrap">
                                {client.full_name || 'Unknown User'}
                              </h3>
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center text-wrap">
                                  <Building2 className="h-4 w-4 mr-1 flex-shrink-0" />
                                  {client.company_name || 'No company'}
                                </span>
                                <span className="flex items-center text-wrap">
                                  <Phone className="h-4 w-4 mr-1 flex-shrink-0" />
                                  {client.phone_number}
                                </span>
                                <span className="flex items-center text-wrap">
                                  <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                                  Joined {formatDate(client.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                            <div className="text-left sm:text-right">
                              <p className="font-medium text-foreground">{client.project_count} Projects</p>
                              {client.has_new_content && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                                  NEW CONTENT
                                </Badge>
                              )}
                            </div>
                            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                              <Link to={`/admin/client/${client.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'messages' && (
              <AdminMessaging />
            )}

            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Project Management</h2>
                    <p className="text-muted-foreground">
                      Monitor and manage all client projects
                    </p>
                  </div>
                </div>

                {/* Project Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border-border-light">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.active_projects}</p>
                          <p className="text-sm text-muted-foreground">Active Projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.completed_projects}</p>
                          <p className="text-sm text-muted-foreground">Completed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.active_projects + stats.completed_projects}</p>
                          <p className="text-sm text-muted-foreground">Total Projects</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* All Projects Table */}
                <Card className="border-border-light">
                  <CardHeader>
                    <CardTitle>All Projects</CardTitle>
                    <CardDescription>
                      Complete overview of all client projects
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {clients.map((client) => (
                        client.projects?.map((project: any) => (
                          <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border-light rounded-lg gap-4">
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 min-w-0 flex-1">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-foreground text-wrap">{project.name}</h3>
                                <p className="text-sm text-muted-foreground text-wrap">
                                  Client: {client.full_name || 'Unknown'}
                                </p>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                <Badge className={`${project.status === 'completed' ? 'bg-green-100 text-green-800' : project.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {project.status === 'in_progress' ? 'In Progress' : project.status === 'completed' ? 'Completed' : 'Starting'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {formatDate(project.updated_at)}
                                </span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                              <Link to={`/admin/client/${client.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Client
                              </Link>
                            </Button>
                          </div>
                        )) || []
                      ))}
                      {clients.every(client => !client.projects || client.projects.length === 0) && (
                        <div className="text-center py-8">
                          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold text-foreground mb-2">No projects yet</h3>
                          <p className="text-muted-foreground">Projects will appear here when clients create them.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Admin Settings</h2>
                  <p className="text-muted-foreground">
                    Configure system settings and preferences
                  </p>
                </div>

                {/* System Settings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-border-light">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <span>System Configuration</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">Auto Notifications</p>
                          <p className="text-sm text-muted-foreground">Receive alerts for client updates</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                          Enabled
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">Real-time Updates</p>
                          <p className="text-sm text-muted-foreground">Live sync of client activities</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                          Active
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">Data Backup</p>
                          <p className="text-sm text-muted-foreground">Automatic daily backups</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                          Daily
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span>User Management</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">Total Registered Clients</p>
                        <p className="text-2xl font-bold text-primary">{stats.total_clients}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">Active This Month</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {clients.filter(client => 
                            client.projects?.some((p: any) => 
                              new Date(p.updated_at).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
                            )
                          ).length}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Admin Actions */}
                <Card className="border-border-light">
                  <CardHeader>
                    <CardTitle>Admin Actions</CardTitle>
                    <CardDescription>
                      Quick actions for system management
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                        <MessageSquare className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">Broadcast Message</span>
                        <span className="text-xs text-muted-foreground">Send to all clients</span>
                      </Button>
                      <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                        <Bell className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">System Alert</span>
                        <span className="text-xs text-muted-foreground">Create announcement</span>
                      </Button>
                      <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        <span className="text-sm font-medium">Generate Report</span>
                        <span className="text-xs text-muted-foreground">Client activity report</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity Log */}
                <Card className="border-border-light">
                  <CardHeader>
                    <CardTitle>Recent System Activity</CardTitle>
                    <CardDescription>
                      Latest admin and system events
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {clients.slice(0, 5).map((client, index) => (
                        <div key={client.id} className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground text-wrap">
                                {client.full_name || 'Client'} updated project
                              </p>
                              <p className="text-xs text-muted-foreground text-wrap">
                                {formatDate(client.updated_at)}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                            Project Update
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
