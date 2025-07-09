import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  CheckCircle,
  X
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
  const [projectStatusFilter, setProjectStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');

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

  const filteredClients = clients.filter(client => {
    // Search filter
    const matchesSearch = client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone_number.includes(searchTerm);

    // Project status filter
    if (projectStatusFilter === 'all') {
      return matchesSearch;
    }

    const hasProjectWithStatus = client.projects?.some(project =>
      project.status === projectStatusFilter
    );

    return matchesSearch && hasProjectWithStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return (a.full_name || '').localeCompare(b.full_name || '');
      case 'company':
        return (a.company_name || '').localeCompare(b.company_name || '');
      case 'created_at':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'updated_at':
      default:
        return new Date(b.latest_activity).getTime() - new Date(a.latest_activity).getTime();
    }
  });

  const clearFilters = () => {
    setSearchTerm('');
    setProjectStatusFilter('all');
    setSortBy('updated_at');
  };

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
      {/* Header - Enhanced Responsive Design */}
      <header className="border-b border-border-light bg-card">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand - Responsive sizing */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground truncate">
                Muahib Solution
              </h1>
              <Badge variant="secondary" className="bg-primary text-primary-foreground text-xs sm:text-sm hidden xs:inline-flex">
                Admin Panel
              </Badge>
            </div>

            {/* Header Actions - Responsive layout */}
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <NotificationDropdown />

              {/* User Info - Progressive disclosure */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                    {user?.full_name ? getInitials(user.full_name) : 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-xs sm:text-sm md:text-base font-medium text-foreground truncate max-w-24 sm:max-w-32 md:max-w-none">
                    {user?.full_name || 'Admin'}
                  </p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </div>

              {/* Logout Button - Responsive */}
              <Button variant="ghost" size="sm" onClick={handleLogout} className="p-2 sm:px-3 sm:py-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container - Enhanced Responsive Layout */}
      <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 max-w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
          {/* Sidebar - Responsive Navigation */}
          <div className="lg:col-span-1">
            {/* Mobile/Tablet Navigation - Enhanced Horizontal Scroll */}
            <div className="lg:hidden mb-4 sm:mb-6">
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Overview
                </Button>

                <Button
                  variant={activeTab === 'clients' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => setActiveTab('clients')}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Clients
                </Button>

                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => setActiveTab('projects')}
                >
                  <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Projects
                </Button>

                <Button
                  variant={activeTab === 'messages' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Messages
                </Button>

                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Desktop Navigation - Enhanced Responsive Vertical Card */}
            <Card className="hidden lg:block border-border-light">
              <CardHeader className="pb-3 lg:pb-4">
                <CardTitle className="text-base lg:text-lg xl:text-xl">Admin Menu</CardTitle>
              </CardHeader>

              <CardContent className="space-y-1 lg:space-y-2">
                <Button
                  variant={activeTab === 'overview' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base py-2 lg:py-2.5"
                  onClick={() => setActiveTab('overview')}
                >
                  <BarChart3 className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  Overview
                </Button>

                <Button
                  variant={activeTab === 'clients' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base py-2 lg:py-2.5"
                  onClick={() => setActiveTab('clients')}
                >
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  Clients
                </Button>

                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base py-2 lg:py-2.5"
                  onClick={() => setActiveTab('projects')}
                >
                  <FolderOpen className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  Projects
                </Button>

                <Button
                  variant={activeTab === 'messages' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base py-2 lg:py-2.5"
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  Messages
                </Button>

                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base py-2 lg:py-2.5"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3" />
                  Settings
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Enhanced Responsive Layout with Comprehensive Breakpoints */}
          <div className="lg:col-span-3 min-w-0 overflow-x-hidden px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8">
            {activeTab === 'overview' && (
              <div className="space-y-3 xs:space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-7 xl:space-y-8 2xl:space-y-10">
                {/* Page Header - Enhanced Responsive Typography with Comprehensive Breakpoints */}
                <div className="text-center xs:text-center sm:text-left px-2 xs:px-3 sm:px-4 md:px-5 lg:px-6 xl:px-8">
                  <h2 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-bold text-foreground leading-tight xs:leading-tight sm:leading-tight">
                    Dashboard Overview
                  </h2>
                  <p className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mt-1 xs:mt-1.5 sm:mt-2 md:mt-2.5 lg:mt-3 leading-relaxed">
                    Monitor your client management system performance
                  </p>
                </div>

                {/* Stats Cards - Enhanced Responsive Grid with Comprehensive Breakpoints */}
                <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6 xl:gap-8">
                  <Card className="border-border-light hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-blue-50/30">
                    <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                      <div className="flex items-center justify-between xs:justify-start xs:space-x-3 sm:space-x-4 md:space-x-5">
                        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Users className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight">
                              {stats.total_clients}
                            </p>
                            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-0.5 xs:mt-1 truncate">
                              Total Clients
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light hover:shadow-lg hover:shadow-yellow-100/50 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-yellow-50/30">
                    <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                      <div className="flex items-center justify-between xs:justify-start xs:space-x-3 sm:space-x-4 md:space-x-5">
                        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <Clock className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight">
                              {stats.active_projects}
                            </p>
                            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-0.5 xs:mt-1 truncate">
                              Active Projects
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light hover:shadow-lg hover:shadow-green-100/50 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-green-50/30">
                    <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                      <div className="flex items-center justify-between xs:justify-start xs:space-x-3 sm:space-x-4 md:space-x-5">
                        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                            <CheckCircle className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 text-green-600 dark:text-green-400 flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight">
                              {stats.completed_projects}
                            </p>
                            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-0.5 xs:mt-1 truncate">
                              Completed
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border-light hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 transform hover:-translate-y-1 bg-gradient-to-br from-white to-purple-50/30">
                    <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                      <div className="flex items-center justify-between xs:justify-start xs:space-x-3 sm:space-x-4 md:space-x-5">
                        <div className="flex items-center space-x-2 xs:space-x-3 sm:space-x-4 flex-1 min-w-0">
                          <div className="p-2 xs:p-2.5 sm:p-3 md:p-3.5 lg:p-4 rounded-full bg-purple-100 dark:bg-purple-900/30">
                            <MessageSquare className="h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 lg:h-8 lg:w-8 xl:h-9 xl:w-9 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground leading-tight">
                              {stats.new_messages}
                            </p>
                            <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-0.5 xs:mt-1 truncate">
                              New Messages
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity - Enhanced Responsive Design with Comprehensive Breakpoints */}
                <Card className="border-border-light shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-7 xl:pb-8 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8">
                    <CardTitle className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                      Recent Client Activity
                    </CardTitle>
                    <CardDescription className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-1 xs:mt-1.5 sm:mt-2">
                      Latest updates from your clients
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-7 xl:pb-8">
                    <div className="space-y-2 xs:space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6">
                      {clients.slice(0, 5).map((client) => (
                        <div key={client.id} className="flex flex-col xs:flex-col sm:flex-row sm:items-center space-y-3 xs:space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-5 lg:space-x-6 p-3 xs:p-4 sm:p-5 md:p-6 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors duration-200 border border-transparent hover:border-border-light">
                          <div className="flex items-center space-x-3 xs:space-x-4 sm:space-x-5 min-w-0 flex-1">
                            <Avatar className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 flex-shrink-0 ring-2 ring-background shadow-sm">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-semibold">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium xs:font-semibold sm:font-bold text-foreground text-wrap text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl leading-tight">
                                {client.full_name || 'Unknown User'}
                              </p>
                              <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground text-wrap mt-0.5 xs:mt-1 leading-relaxed">
                                {client.company_name} • {client.project_count} projects
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between xs:justify-between sm:justify-end space-x-2 xs:space-x-3 sm:space-x-4 w-full xs:w-full sm:w-auto">
                            {client.has_new_content && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs xs:text-sm px-2 xs:px-3 py-1 xs:py-1.5 font-medium">
                                NEW
                              </Badge>
                            )}
                            <Button variant="outline" size="sm" asChild className="flex-shrink-0 h-8 xs:h-9 sm:h-10 md:h-11 lg:h-12 px-2 xs:px-3 sm:px-4 md:px-5 text-xs xs:text-sm sm:text-base hover:bg-primary/10 transition-colors duration-200">
                              <Link to={`/admin/client/${client.id}`}>
                                <Eye className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1 xs:mr-2" />
                                <span className="hidden xs:inline text-xs xs:text-sm sm:text-base">View</span>
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
              <div className="space-y-4 xs:space-y-5 sm:space-y-6 md:space-y-7 lg:space-y-8">
                <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 xs:space-y-4 sm:space-y-0">
                  <div className="text-center xs:text-center sm:text-left">
                    <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                      Client Management
                    </h2>
                    <p className="text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-1 xs:mt-1.5 sm:mt-2">
                      View and manage all registered clients
                    </p>
                  </div>
                </div>

                {/* Search and Filter - Enhanced Responsive Design */}
                <Card className="border-border-light shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardContent className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-7 xl:p-8">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search clients by name, company, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {/* Project Status Filter */}
                        <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Project Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Projects</SelectItem>
                            <SelectItem value="starting">Starting</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Sort By */}
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="updated_at">Last Activity</SelectItem>
                            <SelectItem value="created_at">Date Joined</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {(searchTerm || projectStatusFilter !== 'all' || sortBy !== 'updated_at') && (
                          <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="w-full sm:w-auto"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Clients Table - Enhanced Responsive Design */}
                <Card className="border-border-light shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="pb-3 xs:pb-4 sm:pb-5 md:pb-6 px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8">
                    <CardTitle className="text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-foreground">
                      All Clients ({filteredClients.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 xs:px-4 sm:px-5 md:px-6 lg:px-7 xl:px-8 pb-3 xs:pb-4 sm:pb-5 md:pb-6 lg:pb-7 xl:pb-8">
                    <div className="space-y-3 xs:space-y-4 sm:space-y-5 md:space-y-6">
                      {filteredClients.map((client) => (
                        <div key={client.id} className="flex flex-col xs:flex-col sm:flex-col md:flex-col lg:flex-row lg:items-center justify-between p-3 xs:p-4 sm:p-5 md:p-6 border border-border-light rounded-lg gap-3 xs:gap-4 sm:gap-5 md:gap-6 hover:bg-muted/20 hover:border-primary/20 transition-all duration-200">
                          <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center space-y-3 xs:space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-5 lg:space-x-6 min-w-0 flex-1">
                            <Avatar className="h-10 w-10 xs:h-12 xs:w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-18 lg:w-18 flex-shrink-0 ring-2 ring-background shadow-sm">
                              <AvatarFallback className="bg-primary text-primary-foreground text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-semibold">
                                {client.full_name ? getInitials(client.full_name) : 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium xs:font-semibold sm:font-bold text-foreground text-wrap text-sm xs:text-base sm:text-lg md:text-xl lg:text-2xl leading-tight">
                                {client.full_name || 'Unknown User'}
                              </h3>
                              <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center space-y-1 xs:space-y-1.5 sm:space-y-0 sm:space-x-4 md:space-x-5 lg:space-x-6 text-xs xs:text-sm sm:text-base md:text-lg text-muted-foreground mt-1 xs:mt-1.5 sm:mt-2">
                                <span className="flex items-center text-wrap">
                                  <Building2 className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1 xs:mr-1.5 sm:mr-2 flex-shrink-0" />
                                  {client.company_name || 'No company'}
                                </span>
                                <span className="flex items-center text-wrap">
                                  <Phone className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1 xs:mr-1.5 sm:mr-2 flex-shrink-0" />
                                  {client.phone_number}
                                </span>
                                <span className="flex items-center text-wrap">
                                  <Calendar className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1 xs:mr-1.5 sm:mr-2 flex-shrink-0" />
                                  Joined {formatDate(client.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col xs:flex-col sm:flex-row sm:items-center space-y-3 xs:space-y-3 sm:space-y-0 sm:space-x-4 md:space-x-5 lg:space-x-6 w-full xs:w-full sm:w-auto">
                            <div className="text-center xs:text-center sm:text-right">
                              <p className="font-medium xs:font-semibold sm:font-bold text-foreground text-sm xs:text-base sm:text-lg md:text-xl">
                                {client.project_count} Projects
                              </p>
                              {client.has_new_content && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 w-fit text-xs xs:text-sm px-2 xs:px-3 py-1 xs:py-1.5 font-medium mt-1 xs:mt-1.5">
                                  NEW CONTENT
                                </Badge>
                              )}
                            </div>
                            <Button variant="outline" size="sm" asChild className="w-full xs:w-full sm:w-auto h-8 xs:h-9 sm:h-10 md:h-11 px-3 xs:px-4 sm:px-5 md:px-6 text-xs xs:text-sm sm:text-base hover:bg-primary/10 transition-colors duration-200">
                              <Link to={`/admin/client/${client.id}`}>
                                <Eye className="h-3 w-3 xs:h-4 xs:w-4 sm:h-5 sm:w-5 mr-1 xs:mr-2" />
                                <span className="text-xs xs:text-sm sm:text-base">View Details</span>
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
