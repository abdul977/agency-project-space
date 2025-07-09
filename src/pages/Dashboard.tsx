import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderPlus,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  User,
  Building2,
  Phone,
  Calendar,
  Folder,
  Plus,
  Search,
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CreateProjectModal from "@/components/CreateProjectModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import MessageInterface from "@/components/MessageInterface";
import ClientDeliverables from "@/components/ClientDeliverables";
import MobileNavigation from "@/components/MobileNavigation";
import ProfileEditor from "@/components/ProfileEditor";

interface Project {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
  folder_count?: number;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch user projects
  const fetchProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          folders(count)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      } else {
        const projectsWithFolderCount = data?.map(project => ({
          ...project,
          folder_count: project.folders?.length || 0
        })) || [];
        setProjects(projectsWithFolderCount);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user, toast]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'starting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'starting':
        return 'Starting';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Mobile Navigation */}
      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      {/* Desktop Header */}
      <header className="hidden lg:block border-b border-border-light bg-card">
        <div className="container mx-auto px-4 py-4 max-w-full overflow-x-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-foreground">
                Muahib Solution
              </h1>
              <Badge variant="secondary">
                Client Portal
              </Badge>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationDropdown />

              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.company_name}
                  </p>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 ml-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pt-20 lg:pt-8 pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="border-border-light">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.full_name ? getInitials(user.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {user?.full_name || 'User'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.company_name}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('projects')}
                >
                  <Folder className="h-4 w-4 mr-2" />
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
                  variant={activeTab === 'deliverables' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('deliverables')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Deliverables
                </Button>

                <Button
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('profile')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Your Projects</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Manage your project folders and requirements
                    </p>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </div>

                {projects.length === 0 ? (
                  <Card className="border-border-light">
                    <CardContent className="py-12 text-center">
                      <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No projects yet
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Create your first project to get started with organizing your requirements.
                      </p>
                      <Button
                        className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
                        onClick={() => setIsCreateModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Project
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {projects.map((project) => (
                      <Card key={project.id} className="border-border-light hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-6 text-container-safe">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                                <h3 className="text-lg font-semibold text-foreground text-wrap">
                                  {project.name}
                                </h3>
                                <Badge className={getStatusColor(project.status)}>
                                  {getStatusText(project.status)}
                                </Badge>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-muted-foreground">
                                <span className="flex items-center">
                                  <Folder className="h-4 w-4 mr-1" />
                                  {project.folder_count} folders
                                </span>
                                <span className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Created {formatDate(project.created_at)}
                                </span>
                              </div>
                            </div>

                            <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                              <Link to={`/project/${project.id}`}>
                                Open Project
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Messages</h2>
                  <p className="text-muted-foreground">
                    Communicate with the Muahib Solution team
                  </p>
                </div>

                {/* Get admin user ID - in a real app, this would be dynamic */}
                <MessageInterface
                  conversationUserId="admin" // This should be the actual admin user ID
                  conversationUserName="Muahib Solution Team"
                  conversationUserCompany="Support Team"
                />
              </div>
            )}

            {activeTab === 'deliverables' && (
              <ClientDeliverables />
            )}

            {activeTab === 'profile' && (
              <ProfileEditor />
            )}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onProjectCreated={fetchProjects}
      />
    </div>
  );
};

export default Dashboard;
