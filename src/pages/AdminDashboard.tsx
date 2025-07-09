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
          const processedClients = clientsData?.map(client => ({
            ...client,
            project_count: client.projects?.length || 0,
            latest_activity: client.projects?.length > 0 
              ? Math.max(...client.projects.map(p => new Date(p.updated_at).getTime()))
              : new Date(client.created_at).getTime(),
            has_new_content: client.projects?.some(p => 
              new Date(p.updated_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
            ) || false
          })) || [];
          
          setClients(processedClients);

          // Calculate stats
          const totalClients = processedClients.length;
          const activeProjects = processedClients.reduce((sum, client) => 
            sum + (client.projects?.filter(p => p.status === 'in_progress').length || 0), 0
          );
          const completedProjects = processedClients.reduce((sum, client) => 
            sum + (client.projects?.filter(p => p.status === 'completed').length || 0), 0
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
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
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
                  <p className="text-muted-foreground">
                    Monitor your client management system performance
                  </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="border-border-light">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <Users className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.total_clients}</p>
                          <p className="text-sm text-muted-foreground">Total Clients</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-8 w-8 text-yellow-600" />
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
                        <MessageSquare className="h-8 w-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold text-foreground">{stats.new_messages}</p>
                          <p className="text-sm text-muted-foreground">New Messages</p>
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
                        <div key={client.id} className="flex items-center space-x-4 p-3 rounded-lg bg-muted/30">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {client.full_name ? getInitials(client.full_name) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">
                              {client.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {client.company_name} • {client.project_count} projects
                            </p>
                          </div>
                          {client.has_new_content && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              NEW
                            </Badge>
                          )}
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/client/${client.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Link>
                          </Button>
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
                        <div key={client.id} className="flex items-center justify-between p-4 border border-border-light rounded-lg">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-foreground">
                                {client.full_name || 'Unknown User'}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <Building2 className="h-4 w-4 mr-1" />
                                  {client.company_name || 'No company'}
                                </span>
                                <span className="flex items-center">
                                  <Phone className="h-4 w-4 mr-1" />
                                  {client.phone_number}
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Joined {formatDate(client.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium text-foreground">{client.project_count} Projects</p>
                              {client.has_new_content && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  NEW CONTENT
                                </Badge>
                              )}
                            </div>
                            <Button variant="outline" size="sm" asChild>
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

            {(activeTab === 'projects' || activeTab === 'settings') && (
              <Card className="border-border-light">
                <CardContent className="py-12 text-center">
                  <div className="text-muted-foreground">
                    <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
                    <p>This section is under development and will be available soon.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
