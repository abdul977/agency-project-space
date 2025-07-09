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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Package,
  Trash2,
  AlertTriangle,
  Filter,
  X,
  Edit,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SecurityManager from "@/lib/security";
import CreateProjectModal from "@/components/CreateProjectModal";
import NotificationDropdown from "@/components/NotificationDropdown";
import MessageInterface from "@/components/MessageInterface";
import ClientDeliverables from "@/components/ClientDeliverables";
import MobileNavigation from "@/components/MobileNavigation";
import ProfileEditor from "@/components/ProfileEditor";

interface Project {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'completed' | string;
  created_at: string;
  updated_at: string;
  folder_count?: number;
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_at');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

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
        const projectsWithFolderCount = data?.map((project: any) => ({
          id: project.id,
          name: project.name,
          status: project.status || 'starting',
          created_at: project.created_at,
          updated_at: project.updated_at,
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

  // Filter and sort projects
  useEffect(() => {
    let filtered = projects;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Sort projects
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated_at':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter, sortBy]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortBy('updated_at');
  };

  const startEditingProject = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name);
  };

  const cancelEditingProject = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
  };

  const saveProjectName = async (projectId: string) => {
    if (!user || !editingProjectName.trim()) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editingProjectName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', user.id); // Security check

      if (error) {
        console.error('Error updating project name:', error);
        toast({
          title: "Error",
          description: "Failed to update project name",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setProjects(prev => prev.map(p =>
        p.id === projectId
          ? { ...p, name: editingProjectName.trim(), updated_at: new Date().toISOString() }
          : p
      ));

      setEditingProjectId(null);
      setEditingProjectName('');

      toast({
        title: "Project updated",
        description: "Project name has been updated successfully",
      });

    } catch (error) {
      console.error('Error updating project name:', error);
      toast({
        title: "Error",
        description: "Failed to update project name",
        variant: "destructive",
      });
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user) return;

    setIsDeleting(true);
    try {
      // Security check: Verify user has permission to delete this project
      const canDelete = await SecurityManager.canDeleteProject(user.id, projectId);
      if (!canDelete) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to delete this project",
          variant: "destructive",
        });
        return;
      }
      // Start a transaction-like approach by deleting in order
      // 1. Delete folder inputs first
      const { error: inputsError } = await supabase
        .from('folder_inputs')
        .delete()
        .in('folder_id',
          supabase
            .from('folders')
            .select('id')
            .eq('project_id', projectId)
        );

      if (inputsError) {
        console.error('Error deleting folder inputs:', inputsError);
        throw new Error('Failed to delete folder inputs');
      }

      // 2. Delete folders
      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('project_id', projectId);

      if (foldersError) {
        console.error('Error deleting folders:', foldersError);
        throw new Error('Failed to delete folders');
      }

      // 3. Delete deliverables
      const { error: deliverablesError } = await supabase
        .from('deliverables')
        .delete()
        .eq('project_id', projectId);

      if (deliverablesError) {
        console.error('Error deleting deliverables:', deliverablesError);
        throw new Error('Failed to delete deliverables');
      }

      // 4. Finally delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', user.id); // Extra security check

      if (projectError) {
        console.error('Error deleting project:', projectError);
        throw new Error('Failed to delete project');
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));

      toast({
        title: "Project deleted",
        description: "Project and all related data have been deleted successfully.",
      });

    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteProjectId(null);
    }
  };

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
        <div className="container mx-auto px-4 py-3 lg:py-4 xl:py-6 max-w-full overflow-x-hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 lg:space-x-4 min-w-0">
              <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground truncate">
                Muahib Solution
              </h1>
              <Badge variant="secondary" className="text-xs lg:text-sm shrink-0">
                Client Portal
              </Badge>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4 shrink-0">
              <NotificationDropdown />

              <div className="hidden xl:flex items-center space-x-3">
                <Avatar className="h-8 w-8 lg:h-10 lg:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs lg:text-sm">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm lg:text-base font-medium text-foreground truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">
                    {user?.company_name}
                  </p>
                </div>
              </div>

              {/* Compact user info for smaller desktop screens */}
              <div className="xl:hidden">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {user?.full_name ? getInitials(user.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs lg:text-sm">
                <LogOut className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                <span className="hidden lg:inline">Logout</span>
                <span className="lg:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 pt-16 sm:pt-20 lg:pt-8 pb-16 sm:pb-20 lg:pb-8 max-w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card className="border-border-light">
              <CardHeader className="pb-3 lg:pb-4 xl:pb-6">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10 xl:h-12 xl:w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm xl:text-base">
                      {user?.full_name ? getInitials(user.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground text-sm xl:text-base truncate">
                      {user?.full_name || 'User'}
                    </h3>
                    <p className="text-xs xl:text-sm text-muted-foreground truncate">
                      {user?.company_name}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-1 lg:space-y-2 px-4 lg:px-6">
                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base h-9 lg:h-10"
                  onClick={() => setActiveTab('projects')}
                >
                  <Folder className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Projects</span>
                </Button>

                <Button
                  variant={activeTab === 'messages' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base h-9 lg:h-10"
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Messages</span>
                </Button>

                <Button
                  variant={activeTab === 'deliverables' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base h-9 lg:h-10"
                  onClick={() => setActiveTab('deliverables')}
                >
                  <Package className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Deliverables</span>
                </Button>

                <Button
                  variant={activeTab === 'profile' ? 'default' : 'ghost'}
                  className="w-full justify-start text-sm lg:text-base h-9 lg:h-10"
                  onClick={() => setActiveTab('profile')}
                >
                  <Settings className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">Profile</span>
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

                {/* Filter Section */}
                {projects.length > 0 && (
                  <Card className="border-border-light">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
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
                            <SelectItem value="updated_at">Last Updated</SelectItem>
                            <SelectItem value="created_at">Date Created</SelectItem>
                            <SelectItem value="name">Name</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {(searchTerm || statusFilter !== 'all' || sortBy !== 'updated_at') && (
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
                    </CardContent>
                  </Card>
                )}

                {filteredProjects.length === 0 && projects.length > 0 ? (
                  <Card className="border-border-light">
                    <CardContent className="py-12 text-center">
                      <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No projects match your filters
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        Try adjusting your search or filter criteria
                      </p>
                      <Button variant="outline" onClick={clearFilters}>
                        Clear Filters
                      </Button>
                    </CardContent>
                  </Card>
                ) : projects.length === 0 ? (
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
                    {filteredProjects.map((project) => (
                      <Card key={project.id} className="border-border-light hover:shadow-md transition-shadow">
                        <CardContent className="p-4 sm:p-6 text-container-safe">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  {editingProjectId === project.id ? (
                                    <div className="flex items-center gap-2 flex-1">
                                      <Input
                                        value={editingProjectName}
                                        onChange={(e) => setEditingProjectName(e.target.value)}
                                        className="flex-1"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            saveProjectName(project.id);
                                          } else if (e.key === 'Escape') {
                                            cancelEditingProject();
                                          }
                                        }}
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => saveProjectName(project.id)}
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={cancelEditingProject}
                                        className="text-gray-600 hover:text-gray-700"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <>
                                      <h3 className="text-lg font-semibold text-foreground text-wrap flex-1">
                                        {project.name}
                                      </h3>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startEditingProject(project)}
                                        className="text-gray-600 hover:text-gray-700 p-1"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
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

                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                              <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                <Link to={`/project/${project.id}`}>
                                  Open Project
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteProjectId(project.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Messages</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
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

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={!!deleteProjectId} onOpenChange={() => setDeleteProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete Project
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action will permanently delete:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The project and all its folders</li>
                <li>All folder inputs and content</li>
                <li>All deliverables associated with this project</li>
              </ul>
              <strong className="text-red-600 block mt-2">This action cannot be undone.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteProjectId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProjectId && deleteProject(deleteProjectId)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
