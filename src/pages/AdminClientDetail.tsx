import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
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
                Message Client
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Client Info */}
          <div className="lg:col-span-1">
            <Card className="border-border-light">
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Full Name:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {client.full_name || 'Not provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Company:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {client.company_name || 'Not provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Phone:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {client.phone_number}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Joined:</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {formatDate(client.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="border-border-light mt-6">
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
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Client Projects</h2>
                  <p className="text-muted-foreground">
                    View and manage all projects for this client
                  </p>
                </div>

                {projects.length === 0 ? (
                  <Card className="border-border-light">
                    <CardContent className="py-12 text-center">
                      <Folder className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No projects yet
                      </h3>
                      <p className="text-muted-foreground">
                        This client hasn't created any projects yet.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {projects.map((project) => (
                      <Card key={project.id} className="border-border-light">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-foreground">
                                {project.name}
                              </h3>
                              <Badge className={getStatusColor(project.status)}>
                                {getStatusIcon(project.status)}
                                <span className="ml-1">{getStatusText(project.status)}</span>
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-2">
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
                              </div>
                            </div>
                          </div>
                          <CardDescription>
                            Created {formatDate(project.created_at)} • {project.folders.length} folders
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="space-y-4">
                          {project.folders.map((folder) => (
                            <div key={folder.id} className="border border-border-light rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-3">
                                <Folder className="h-4 w-4 text-primary" />
                                <h4 className="font-medium text-foreground">{folder.name}</h4>
                                <Badge variant="secondary" className="text-xs">
                                  {folder.inputs.length} inputs
                                </Badge>
                              </div>
                              
                              <div className="space-y-2">
                                {folder.inputs.map((input, index) => (
                                  <div key={input.id} className="bg-muted/30 rounded p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Input {index + 1}
                                        </p>
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                          {input.content || 'No content provided'}
                                        </p>
                                      </div>
                                      <p className="text-xs text-muted-foreground ml-4">
                                        {formatDate(input.updated_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                
                                {folder.inputs.length === 0 && (
                                  <p className="text-sm text-muted-foreground italic">
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
    </div>
  );
};

export default AdminClientDetail;
