import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  X,
  Edit,
  Trash2,
  Copy,
  Archive,
  RefreshCw,
  Download,
  Upload,
  Calendar,
  User,
  Building2,
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Settings,
  FileText,
  Save,
  Users
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  status: 'starting' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  updated_at: string;
  user_id: string;
  client_name: string;
  company_name: string;
  folders_count: number;
  deliverables_count: number;
  last_activity: string;
}

interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  default_folders: string[];
  estimated_duration: number; // days
  category: string;
  is_active: boolean;
}

const AdminAdvancedProjectManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('projects');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    default_folders: ['Documents', 'Images', 'Videos'],
    estimated_duration: 30,
    category: 'general'
  });

  // Load projects and templates
  useEffect(() => {
    loadProjects();
    loadTemplates();
  }, []);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          users (
            full_name,
            company_name
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading projects:', error);
        toast({
          title: "Error",
          description: "Failed to load projects",
          variant: "destructive",
        });
      } else {
        const formattedProjects: Project[] = (data || []).map(project => ({
          id: project.id,
          name: project.name,
          status: project.status || 'starting',
          priority: 'medium', // Default priority, would be added to schema
          created_at: project.created_at,
          updated_at: project.updated_at,
          user_id: project.user_id,
          client_name: project.users?.full_name || 'Unknown Client',
          company_name: project.users?.company_name || '',
          folders_count: project.folders?.length || 0,
          deliverables_count: 0, // Would be calculated from deliverables
          last_activity: project.updated_at
        }));
        setProjects(formattedProjects);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data: templates, error } = await supabase
        .from('project_templates')
        .select(`
          *,
          created_by_user:created_by (
            full_name
          )
        `)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) {
        console.error('Error loading templates:', error);
        toast({
          title: "Error",
          description: "Failed to load project templates",
          variant: "destructive",
        });
        return;
      }

      const formattedTemplates: ProjectTemplate[] = (templates || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        default_folders: template.default_folders || [],
        estimated_duration: template.estimated_duration || 30,
        category: template.category || 'general',
        is_active: template.is_active
      }));

      setTemplates(formattedTemplates);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: "Error",
        description: "Failed to load project templates",
        variant: "destructive",
      });
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || project.priority === priorityFilter;
    const matchesClient = clientFilter === 'all' || project.user_id === clientFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const now = new Date();
      const projectDate = new Date(project.updated_at);
      const daysDiff = Math.floor((now.getTime() - projectDate.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'today':
          matchesDate = daysDiff === 0;
          break;
        case 'week':
          matchesDate = daysDiff <= 7;
          break;
        case 'month':
          matchesDate = daysDiff <= 30;
          break;
        case 'quarter':
          matchesDate = daysDiff <= 90;
          break;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPriority && matchesClient && matchesDate;
  });

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const selectAllProjects = () => {
    if (selectedProjects.size === filteredProjects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(filteredProjects.map(p => p.id)));
    }
  };

  const bulkUpdateStatus = async (newStatus: Project['status']) => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedProjects);
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedIds);

      if (error) {
        console.error('Error updating projects:', error);
        toast({
          title: "Error",
          description: "Failed to update some projects",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setProjects(prev => prev.map(project =>
        selectedIds.includes(project.id)
          ? { ...project, status: newStatus, updated_at: new Date().toISOString() }
          : project
      ));

      toast({
        title: "Projects Updated",
        description: `${selectedIds.length} projects updated to ${newStatus}`,
      });

      setSelectedProjects(new Set());

    } catch (error) {
      console.error('Error bulk updating projects:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const bulkDeleteProjects = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedProjects);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Error deleting projects:', error);
        toast({
          title: "Error",
          description: "Failed to delete some projects",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setProjects(prev => prev.filter(project => !selectedIds.includes(project.id)));
      setSelectedProjects(new Set());

      toast({
        title: "Projects Deleted",
        description: `${selectedIds.length} projects deleted successfully`,
      });

    } catch (error) {
      console.error('Error bulk deleting projects:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const createTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newTemplate, error } = await supabase
        .from('project_templates')
        .insert({
          name: templateForm.name.trim(),
          description: templateForm.description.trim(),
          default_folders: templateForm.default_folders,
          estimated_duration: templateForm.estimated_duration,
          category: templateForm.category,
          is_active: true,
          created_by: user?.id,
          usage_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating template:', error);
        toast({
          title: "Error",
          description: "Failed to create template",
          variant: "destructive",
        });
        return;
      }

      const formattedTemplate: ProjectTemplate = {
        id: newTemplate.id,
        name: newTemplate.name,
        description: newTemplate.description,
        default_folders: newTemplate.default_folders,
        estimated_duration: newTemplate.estimated_duration,
        category: newTemplate.category,
        is_active: newTemplate.is_active
      };

      setTemplates(prev => [formattedTemplate, ...prev]);

      toast({
        title: "Template Created",
        description: "Project template has been created successfully",
      });

      setTemplateForm({
        name: '',
        description: '',
        default_folders: ['Documents', 'Images', 'Videos'],
        estimated_duration: 30,
        category: 'general'
      });
      setIsTemplateModalOpen(false);

    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const exportProjects = () => {
    const exportData = {
      projects: filteredProjects,
      export_metadata: {
        exported_at: new Date().toISOString(),
        exported_by: user?.full_name || 'Admin',
        total_projects: filteredProjects.length,
        filters_applied: {
          search: searchTerm,
          status: statusFilter,
          priority: priorityFilter,
          client: clientFilter,
          date: dateFilter
        }
      }
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `projects_export_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast({
      title: "Export Complete",
      description: "Projects data has been exported successfully",
    });
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'starting': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Project['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Advanced Project Management</h2>
          <p className="text-muted-foreground">
            Comprehensive project management with bulk operations and templates
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={exportProjects}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Project Template</DialogTitle>
                <DialogDescription>
                  Create a reusable project template
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    placeholder="Enter template name"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Enter template description"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-category">Category</Label>
                    <Select
                      value={templateForm.category}
                      onValueChange={(value) => setTemplateForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="web">Web Development</SelectItem>
                        <SelectItem value="mobile">Mobile App</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="template-duration">Duration (days)</Label>
                    <Input
                      id="template-duration"
                      type="number"
                      min="1"
                      max="365"
                      value={templateForm.estimated_duration}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Folders</Label>
                  <div className="flex flex-wrap gap-2">
                    {templateForm.default_folders.map((folder, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        {folder}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => {
                            const newFolders = templateForm.default_folders.filter((_, i) => i !== index);
                            setTemplateForm(prev => ({ ...prev, default_folders: newFolders }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add folder name"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const input = e.target as HTMLInputElement;
                          const newFolder = input.value.trim();
                          if (newFolder && !templateForm.default_folders.includes(newFolder)) {
                            setTemplateForm(prev => ({
                              ...prev,
                              default_folders: [...prev.default_folders, newFolder]
                            }));
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
                        const newFolder = input?.value.trim();
                        if (newFolder && !templateForm.default_folders.includes(newFolder)) {
                          setTemplateForm(prev => ({
                            ...prev,
                            default_folders: [...prev.default_folders, newFolder]
                          }));
                          input.value = '';
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTemplateForm({
                      name: '',
                      description: '',
                      default_folders: ['Documents', 'Images', 'Videos'],
                      estimated_duration: 30,
                      category: 'general'
                    });
                    setIsTemplateModalOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createTemplate}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'projects' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('projects')}
          className="flex items-center gap-2"
        >
          <FolderOpen className="h-4 w-4" />
          Projects
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('templates')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Templates
        </Button>
      </div>

      {activeTab === 'projects' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">{projects.length}</p>
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {projects.filter(p => p.status === 'in_progress').length}
                    </p>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {projects.filter(p => p.status === 'completed').length}
                    </p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {new Set(projects.map(p => p.user_id)).size}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects, clients, or companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="starting">Starting</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {Array.from(new Set(projects.map(p => p.user_id))).map(userId => {
                      const project = projects.find(p => p.user_id === userId);
                      return (
                        <SelectItem key={userId} value={userId}>
                          {project?.client_name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {filteredProjects.length} of {projects.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          {selectedProjects.size > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProjects.size === filteredProjects.length}
                      onCheckedChange={selectAllProjects}
                    />
                    <span className="text-sm font-medium">
                      {selectedProjects.size} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select onValueChange={(value) => bulkUpdateStatus(value as Project['status'])}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Update Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="starting">Starting</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBulkOperating}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Selected
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Selected Projects</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {selectedProjects.size} selected projects? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={bulkDeleteProjects}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete All
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProjects(new Set())}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Projects Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedProjects.size === filteredProjects.length && filteredProjects.length > 0}
                    onCheckedChange={selectAllProjects}
                  />
                  <span className="text-sm text-muted-foreground">Select All</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No projects found
                  </h3>
                  <p className="text-muted-foreground">
                    {projects.length === 0
                      ? "No projects have been created yet"
                      : "No projects match your current filters"
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedProjects.has(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                          className="mt-1"
                        />

                        <div className="flex-1 space-y-2">
                          {/* Header Row */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {project.name}
                              </h3>
                              <Badge className={getStatusColor(project.status)}>
                                {project.status === 'in_progress' ? 'In Progress' :
                                 project.status === 'on_hold' ? 'On Hold' :
                                 project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                              </Badge>
                              <Badge className={getPriorityColor(project.priority)}>
                                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                              </Badge>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/admin/client/${project.user_id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button variant="ghost" size="sm">
                                <Copy className="h-4 w-4" />
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{project.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>

                          {/* Client and Company Info */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                                  {getInitials(project.client_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{project.client_name}</span>
                            </div>
                            {project.company_name && (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                <span>{project.company_name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FolderOpen className="h-4 w-4" />
                              <span>{project.folders_count} folders</span>
                            </div>
                          </div>
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

      {activeTab === 'templates' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Templates
            </CardTitle>
            <CardDescription>
              Manage reusable project templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No templates yet
                </h3>
                <p className="text-muted-foreground">
                  Create your first project template to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <Badge variant="outline" className="mt-1">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        {template.description}
                      </p>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{template.estimated_duration} days</span>
                        </div>

                        <div>
                          <p className="text-sm font-medium mb-2">Default Folders:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.default_folders.map((folder, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {folder}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Button className="w-full mt-4" variant="outline">
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAdvancedProjectManager;
