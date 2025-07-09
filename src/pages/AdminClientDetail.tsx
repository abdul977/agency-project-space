import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Calendar,
  Folder,
  FileText,
  MessageSquare,
  Settings,
  Eye,
  Edit,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SecurityManager from "@/lib/security";
import DeliverableManager from "@/components/DeliverableManager";
import MessageInterface from "@/components/MessageInterface";

interface ClientData {
  id: string;
  phone_number: string;
  full_name: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'completed' | string;
  created_at: string;
  updated_at: string;
  folders: Folder[];
}

interface Folder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  inputs: FolderInput[];
}

interface FolderInput {
  id: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

const AdminClientDetail = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [client, setClient] = useState<ClientData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-select first project when switching to deliverables tab
  useEffect(() => {
    if (activeTab === 'deliverables' && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [activeTab, projects, selectedProjectId]);

  // Fetch client data
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId || !user?.is_admin) return;

      try {
        // Fetch client info
        const { data: clientData, error: clientError } = await supabase
          .from('users')
          .select('*')
          .eq('id', clientId)
          .eq('is_admin', false)
          .single();

        if (clientError || !clientData) {
          toast({
            title: "Error",
            description: "Client not found",
            variant: "destructive",
          });
          navigate('/admin');
          return;
        }

        setClient(clientData);

        // Fetch client projects with folders and inputs
        const { data: projectsData, error: projectsError } = await supabase
          .from('projects')
          .select(`
            *,
            folders (
              *,
              folder_inputs (
                id,
                content,
                order_index,
                created_at,
                updated_at
              )
            )
          `)
          .eq('user_id', clientId)
          .order('updated_at', { ascending: false });

        if (projectsError) {
          console.error('Error fetching projects:', projectsError);
          toast({
            title: "Error",
            description: "Failed to load client projects",
            variant: "destructive",
          });
        } else {
          const processedProjects = projectsData?.map(project => ({
            ...project,
            folders: project.folders?.map(folder => ({
              ...folder,
              inputs: folder.folder_inputs?.sort((a, b) => a.order_index - b.order_index) || []
            })) || []
          })) || [];
          setProjects(processedProjects);
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
        toast({
          title: "Error",
          description: "Failed to load client data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientData();
  }, [clientId, user, navigate, toast]);

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'starting':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const updateProjectStatus = async (projectId: string, newStatus: 'starting' | 'in_progress' | 'completed') => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: newStatus })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project status:', error);
        toast({
          title: "Error",
          description: "Failed to update project status",
          variant: "destructive",
        });
      } else {
        setProjects(prev => prev.map(project => 
          project.id === projectId ? { ...project, status: newStatus } : project
        ));
        toast({
          title: "Status updated",
          description: `Project status changed to ${getStatusText(newStatus)}`,
        });
      }
    } catch (error) {
      console.error('Error updating project status:', error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!user || !clientId) return;

    setIsDeleting(true);
    try {
      // Security check: Verify user is admin
      const isAdminUser = await SecurityManager.isAdmin(user.id);
      if (!isAdminUser) {
        toast({
          title: "Access Denied",
          description: "Only administrators can delete projects",
          variant: "destructive",
        });
        return;
      }

      // Admin-level deletion with additional safety checks
      // 1. Verify the project belongs to the specified client
      const { data: projectCheck, error: checkError } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

      if (checkError || !projectCheck || projectCheck.user_id !== clientId) {
        throw new Error('Project not found or access denied');
      }

      // 2. Delete folder inputs first
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

      // 3. Delete folders
      const { error: foldersError } = await supabase
        .from('folders')
        .delete()
        .eq('project_id', projectId);

      if (foldersError) {
        console.error('Error deleting folders:', foldersError);
        throw new Error('Failed to delete folders');
      }

      // 4. Delete deliverables
      const { error: deliverablesError } = await supabase
        .from('deliverables')
        .delete()
        .eq('project_id', projectId);

      if (deliverablesError) {
        console.error('Error deleting deliverables:', deliverablesError);
        throw new Error('Failed to delete deliverables');
      }

      // 5. Finally delete the project
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', clientId); // Extra security check

      if (projectError) {
        console.error('Error deleting project:', projectError);
        throw new Error('Failed to delete project');
      }

      // Update local state
      setProjects(prev => prev.filter(p => p.id !== projectId));

      // Clear selected project if it was deleted
      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Client not found</h2>
          <Button asChild>
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-light bg-card">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 md:hidden">
            {/* Top row: Back button and action buttons */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Back to Admin</span>
                  <span className="xs:hidden">Back</span>
                </Link>
              </Button>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('messages')}
                  className="px-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">Message Client</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('settings')}
                  className="px-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Settings</span>
                </Button>
              </div>
            </div>

            {/* Bottom row: Client info */}
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {client.full_name ? getInitials(client.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {client.full_name || 'Unknown User'}
                </h1>
                <p className="text-sm text-muted-foreground truncate">
                  {client.company_name} • {projects.length} projects
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-4 lg:space-x-6">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="flex items-center space-x-3 lg:space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {client.full_name ? getInitials(client.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {client.full_name || 'Unknown User'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {client.company_name} • {projects.length} projects
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('messages')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                <span className="hidden lg:inline">Message Client</span>
                <span className="lg:hidden">Message</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {/* Sidebar - Client Info */}
          <div className="lg:col-span-1">
            <Card className="border-border-light">
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl lg:text-2xl">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Full Name:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 truncate">
                    {client.full_name || 'Not provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Company:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 truncate">
                    {client.company_name || 'Not provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Phone:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 truncate">
                    {client.phone_number}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">Joined:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6 truncate">
                    {formatDate(client.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Navigation - Horizontal Scroll */}
            <div className="lg:hidden mt-4 sm:mt-6">
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-3 py-2 text-sm"
                  onClick={() => setActiveTab('projects')}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Projects ({projects.length})</span>
                  <span className="xs:hidden">Projects</span>
                </Button>

                <Button
                  variant={activeTab === 'messages' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-3 py-2 text-sm"
                  onClick={() => setActiveTab('messages')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Button>

                <Button
                  variant={activeTab === 'deliverables' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-3 py-2 text-sm"
                  onClick={() => setActiveTab('deliverables')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Deliverables</span>
                  <span className="sm:hidden">Files</span>
                </Button>

                <Button
                  variant={activeTab === 'settings' ? 'default' : 'ghost'}
                  className="flex-shrink-0 px-3 py-2 text-sm"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>

            {/* Desktop Navigation - Vertical Card */}
            <Card className="hidden lg:block border-border-light mt-6">
              <CardContent className="p-4 space-y-2">
                <Button
                  variant={activeTab === 'projects' ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => setActiveTab('projects')}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  Projects ({projects.length})
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
                  <Send className="h-4 w-4 mr-2" />
                  Deliverables
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
            {activeTab === 'projects' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="text-center sm:text-left">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Client Projects</h2>
                  <p className="text-sm sm:text-base text-muted-foreground mt-1">
                    View and manage all projects for this client
                  </p>
                </div>

                {projects.length === 0 ? (
                  <Card className="border-border-light">
                    <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
                      <Folder className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                      <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                        No projects yet
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        This client hasn't created any projects yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {projects.map((project) => (
                      <Card key={project.id} className="border-border-light">
                        <CardHeader className="pb-4 sm:pb-6">
                          {/* Mobile Layout */}
                          <div className="sm:hidden space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base font-semibold text-foreground truncate">
                                  {project.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Created {formatDate(project.created_at)} • {project.folders.length} folders
                                </p>
                              </div>
                              <Badge className={`${getStatusColor(project.status)} shrink-0 text-xs`}>
                                {getStatusIcon(project.status)}
                                <span className="ml-1">{getStatusText(project.status)}</span>
                              </Badge>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2">
                              <select
                                value={project.status}
                                onChange={(e) => updateProjectStatus(project.id, e.target.value as any)}
                                className="text-sm border border-border-light rounded px-2 py-1 bg-background flex-1"
                              >
                                <option value="starting">Starting</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                              </select>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProjectId(project.id);
                                    setActiveTab('deliverables');
                                  }}
                                  className="flex-1"
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  <span className="hidden xs:inline">Deliverables</span>
                                  <span className="xs:hidden">Files</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteProjectId(project.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Desktop Layout */}
                          <div className="hidden sm:block">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 min-w-0 flex-1">
                                <h3 className="text-lg font-semibold text-foreground truncate">
                                  {project.name}
                                </h3>
                                <Badge className={getStatusColor(project.status)}>
                                  {getStatusIcon(project.status)}
                                  <span className="ml-1">{getStatusText(project.status)}</span>
                                </Badge>
                              </div>

                              <div className="flex items-center space-x-2 shrink-0">
                                <select
                                  value={project.status}
                                  onChange={(e) => updateProjectStatus(project.id, e.target.value as any)}
                                  className="text-sm border border-border-light rounded px-2 py-1 bg-background"
                                >
                                  <option value="starting">Starting</option>
                                  <option value="in_progress">In Progress</option>
                                  <option value="completed">Completed</option>
                                </select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProjectId(project.id);
                                    setActiveTab('deliverables');
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-2" />
                                  Deliverables
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeleteProjectId(project.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <CardDescription className="mt-2">
                              Created {formatDate(project.created_at)} • {project.folders.length} folders
                            </CardDescription>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                          {project.folders.map((folder) => (
                            <div key={folder.id} className="border border-border-light rounded-lg p-3 sm:p-4">
                              <div className="flex items-center justify-between sm:justify-start sm:space-x-2 mb-3">
                                <div className="flex items-center space-x-2 min-w-0 flex-1">
                                  <Folder className="h-4 w-4 text-primary shrink-0" />
                                  <h4 className="font-medium text-foreground truncate">{folder.name}</h4>
                                </div>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {folder.inputs.length} inputs
                                </Badge>
                              </div>

                              <div className="space-y-2 sm:space-y-3">
                                {folder.inputs.map((input, index) => (
                                  <div key={input.id} className="bg-muted/30 rounded p-2 sm:p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Input {index + 1}
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                                          {input.content || 'No content provided'}
                                        </p>
                                      </div>
                                      <p className="text-xs text-muted-foreground shrink-0 sm:ml-4">
                                        {formatDate(input.updated_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))}

                                {folder.inputs.length === 0 && (
                                  <p className="text-sm text-muted-foreground italic text-center sm:text-left">
                                    No inputs added yet
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {project.folders.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                              No folders created yet
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'messages' && (
              <Card className="border-border-light">
                <CardHeader>
                  <CardTitle>Messages with {client.full_name || 'Client'}</CardTitle>
                  <CardDescription>
                    Direct messaging with {client.company_name || 'the client'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MessageInterface
                    conversationUserId={client.id}
                    conversationUserName={client.full_name || 'Unknown User'}
                    conversationUserCompany={client.company_name}
                  />
                </CardContent>
              </Card>
            )}

            {activeTab === 'deliverables' && (
              <div className="space-y-6">
                {projects.length > 1 && (
                  <Card className="border-border-light">
                    <CardHeader>
                      <CardTitle>Select Project</CardTitle>
                      <CardDescription>
                        Choose which project to manage deliverables for
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {projects.map((project) => (
                          <Button
                            key={project.id}
                            variant={selectedProjectId === project.id ? "default" : "outline"}
                            className="justify-start h-auto p-4"
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            <div className="text-left">
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Status: {project.status.replace('_', ' ')}
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedProjectId ? (
                  <DeliverableManager
                    projectId={selectedProjectId}
                    clientId={client.id}
                    clientName={client.full_name || 'Unknown Client'}
                    projectName={projects.find(p => p.id === selectedProjectId)?.name || 'Project'}
                  />
                ) : projects.length === 0 ? (
                  <Card className="border-border-light">
                    <CardContent className="py-12 text-center">
                      <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Projects Found
                      </h3>
                      <p className="text-muted-foreground">
                        This client doesn't have any projects yet
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}

            {activeTab === 'settings' && (
              <Card className="border-border-light">
                <CardHeader>
                  <CardTitle>Client Settings</CardTitle>
                  <CardDescription>
                    Manage settings for {client.full_name || 'this client'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Account Information</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Full Name:</span>
                          <span>{client.full_name || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Company:</span>
                          <span>{client.company_name || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Phone:</span>
                          <span>{client.phone_number || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Member Since:</span>
                          <span>{new Date(client.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Project Statistics</h4>
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Projects:</span>
                          <span>{projects.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Projects:</span>
                          <span>{projects.filter(p => p.status === 'in_progress').length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completed Projects:</span>
                          <span>{projects.filter(p => p.status === 'completed').length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Actions</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Feature Coming Soon",
                              description: "Client account management features will be available soon",
                            });
                          }}
                        >
                          Edit Client Info
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Feature Coming Soon",
                              description: "Export client data functionality will be available soon",
                            });
                          }}
                        >
                          Export Data
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

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

export default AdminClientDetail;
