import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Send,
  Download,
  ExternalLink,
  Search,
  Filter,
  X,
  FileText,
  Globe,
  Calendar,
  User,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Copy,
  Archive,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notifyClientOfDeliverable } from '@/lib/notifications';
import SecurityManager from '@/lib/security';

interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string;
  deliverable_type: 'url' | 'file' | string;
  deliverable_url?: string;
  file_path?: string;
  is_sent: boolean;
  created_at: string;
  sent_at?: string;
  projects?: {
    id: string;
    name: string;
    user_id: string;
    users?: {
      full_name: string;
      company_name: string;
    };
  };
}

interface FormData {
  title: string;
  description: string;
  type: 'url' | 'file';
  url: string;
  file: File | null;
  projectId: string;
}

const AdminDeliverableManager = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [projects, setProjects] = useState<Array<{id: string, name: string, user_id: string, client_name: string}>>([]);
  const [clients, setClients] = useState<Array<{id: string, full_name: string, company_name: string}>>([]);
  
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'url',
    url: '',
    file: null,
    projectId: ''
  });

  const { toast } = useToast();

  // Fetch all deliverables with project and client information
  useEffect(() => {
    const fetchDeliverables = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('deliverables')
          .select(`
            *,
            projects (
              id,
              name,
              user_id,
              users (
                full_name,
                company_name
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching deliverables:', error);
          toast({
            title: "Error",
            description: "Failed to load deliverables",
            variant: "destructive",
          });
        } else {
          setDeliverables(data || []);
          
          // Extract unique projects and clients for filters
          const uniqueProjects = Array.from(
            new Map(
              (data || [])
                .filter(d => d.projects)
                .map(d => [
                  d.projects!.id, 
                  {
                    id: d.projects!.id,
                    name: d.projects!.name,
                    user_id: d.projects!.user_id,
                    client_name: d.projects!.users?.full_name || 'Unknown Client'
                  }
                ])
            ).values()
          );
          
          const uniqueClients = Array.from(
            new Map(
              (data || [])
                .filter(d => d.projects?.users)
                .map(d => [
                  d.projects!.user_id,
                  {
                    id: d.projects!.user_id,
                    full_name: d.projects!.users!.full_name || 'Unknown',
                    company_name: d.projects!.users!.company_name || ''
                  }
                ])
            ).values()
          );
          
          setProjects(uniqueProjects);
          setClients(uniqueClients);
        }
      } catch (error) {
        console.error('Error fetching deliverables:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliverables();
  }, [toast]);

  // Filter deliverables based on search and filters
  useEffect(() => {
    let filtered = deliverables;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.projects?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.projects?.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.projects?.users?.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => {
        if (statusFilter === 'sent') return d.is_sent;
        if (statusFilter === 'draft') return !d.is_sent;
        return true;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(d => d.deliverable_type === typeFilter);
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(d => d.project_id === projectFilter);
    }

    // Client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(d => d.projects?.user_id === clientFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          filterDate.setMonth(now.getMonth() - 3);
          break;
      }
      
      if (dateFilter !== 'all') {
        filtered = filtered.filter(d => new Date(d.created_at) >= filterDate);
      }
    }

    setFilteredDeliverables(filtered);
  }, [deliverables, searchTerm, statusFilter, typeFilter, projectFilter, clientFilter, dateFilter]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'url',
      url: '',
      file: null,
      projectId: projects.length > 0 ? projects[0].id : ''
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

  const toggleSelectDeliverable = (id: string) => {
    setSelectedDeliverables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllDeliverables = () => {
    if (selectedDeliverables.size === filteredDeliverables.length) {
      setSelectedDeliverables(new Set());
    } else {
      setSelectedDeliverables(new Set(filteredDeliverables.map(d => d.id)));
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setProjectFilter('all');
    setClientFilter('all');
    setDateFilter('all');
    setSelectedDeliverables(new Set());
  };

  // Create deliverable
  const createDeliverable = async () => {
    try {
      if (!formData.title.trim()) {
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive",
        });
        return;
      }

      if (formData.type === 'url' && !formData.url.trim()) {
        toast({
          title: "Error",
          description: "URL is required for URL deliverables",
          variant: "destructive",
        });
        return;
      }

      if (formData.type === 'file' && !formData.file) {
        toast({
          title: "Error",
          description: "File is required for file deliverables",
          variant: "destructive",
        });
        return;
      }

      // Validate URL if provided
      if (formData.type === 'url' && formData.url.trim()) {
        const urlValidation = SecurityManager.validateUrl(formData.url.trim());
        if (!urlValidation.valid) {
          toast({
            title: "Invalid URL",
            description: urlValidation.error,
            variant: "destructive",
          });
          return;
        }
      }

      let filePath = null;
      let fileUrl = null;

      if (formData.type === 'file' && formData.file) {
        try {
          // Generate unique filename
          const fileExt = formData.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          filePath = `deliverables/admin/${fileName}`;

          // Upload file to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('deliverables')
            .upload(filePath, formData.file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Error uploading file:', uploadError);
            toast({
              title: "Upload Error",
              description: `Failed to upload file: ${uploadError.message}`,
              variant: "destructive",
            });
            return;
          }

          // Get public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('deliverables')
            .getPublicUrl(filePath);

          fileUrl = urlData.publicUrl;
        } catch (error) {
          console.error('Error during file upload:', error);
          toast({
            title: "Upload Error",
            description: "Failed to upload file. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      if (!formData.projectId) {
        toast({
          title: "Error",
          description: "Please select a project for this deliverable.",
          variant: "destructive",
        });
        return;
      }

      const { data: deliverable, error } = await supabase
        .from('deliverables')
        .insert({
          project_id: formData.projectId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          deliverable_type: formData.type,
          deliverable_url: formData.type === 'url' ? formData.url.trim() : fileUrl,
          file_path: filePath,
          is_sent: false
        })
        .select(`
          *,
          projects (
            id,
            name,
            user_id,
            users (
              full_name,
              company_name
            )
          )
        `)
        .single();

      if (error) {
        console.error('Error creating deliverable:', error);
        toast({
          title: "Error",
          description: "Failed to create deliverable",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => [deliverable, ...prev]);

      toast({
        title: "Success",
        description: "Deliverable created successfully",
      });

      resetForm();
      setIsCreateModalOpen(false);

    } catch (error) {
      console.error('Error creating deliverable:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Update deliverable
  const updateDeliverable = async () => {
    if (!editingDeliverable) return;

    try {
      if (!formData.title.trim()) {
        toast({
          title: "Error",
          description: "Title is required",
          variant: "destructive",
        });
        return;
      }

      let updateData: any = {
        title: formData.title.trim(),
        description: formData.description.trim(),
      };

      // Handle file upload for updates
      if (formData.type === 'file' && formData.file) {
        try {
          // Delete old file if it exists
          if (editingDeliverable.file_path) {
            await supabase.storage
              .from('deliverables')
              .remove([editingDeliverable.file_path]);
          }

          // Upload new file
          const fileExt = formData.file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          const filePath = `deliverables/admin/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('deliverables')
            .upload(filePath, formData.file);

          if (uploadError) {
            throw uploadError;
          }

          const { data: urlData } = supabase.storage
            .from('deliverables')
            .getPublicUrl(filePath);

          updateData.file_path = filePath;
          updateData.deliverable_url = urlData.publicUrl;
        } catch (error) {
          console.error('Error uploading file:', error);
          toast({
            title: "Upload Error",
            description: "Failed to upload new file",
            variant: "destructive",
          });
          return;
        }
      } else if (formData.type === 'url') {
        // Validate URL
        const urlValidation = SecurityManager.validateUrl(formData.url.trim());
        if (!urlValidation.valid) {
          toast({
            title: "Invalid URL",
            description: urlValidation.error,
            variant: "destructive",
          });
          return;
        }
        updateData.deliverable_url = formData.url.trim();
        updateData.file_path = null;
      }

      const { error } = await supabase
        .from('deliverables')
        .update(updateData)
        .eq('id', editingDeliverable.id);

      if (error) {
        console.error('Error updating deliverable:', error);
        toast({
          title: "Error",
          description: "Failed to update deliverable",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => prev.map(d =>
        d.id === editingDeliverable.id
          ? { ...d, ...updateData }
          : d
      ));

      toast({
        title: "Success",
        description: "Deliverable updated successfully",
      });

      resetForm();
      setIsEditModalOpen(false);
      setEditingDeliverable(null);

    } catch (error) {
      console.error('Error updating deliverable:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Delete deliverable
  const deleteDeliverable = async (deliverableId: string) => {
    setIsDeleting(deliverableId);
    try {
      const deliverable = deliverables.find(d => d.id === deliverableId);

      // Delete file from storage if it exists
      if (deliverable?.file_path) {
        await supabase.storage
          .from('deliverables')
          .remove([deliverable.file_path]);
      }

      const { error } = await supabase
        .from('deliverables')
        .delete()
        .eq('id', deliverableId);

      if (error) {
        console.error('Error deleting deliverable:', error);
        toast({
          title: "Error",
          description: "Failed to delete deliverable",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
      setSelectedDeliverables(prev => {
        const newSet = new Set(prev);
        newSet.delete(deliverableId);
        return newSet;
      });

      toast({
        title: "Success",
        description: "Deliverable deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting deliverable:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  // Send deliverable
  const sendDeliverable = async (deliverableId: string) => {
    setIsSending(deliverableId);
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq('id', deliverableId);

      if (error) {
        console.error('Error sending deliverable:', error);
        toast({
          title: "Error",
          description: "Failed to send deliverable",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => prev.map(d =>
        d.id === deliverableId
          ? { ...d, is_sent: true, sent_at: new Date().toISOString() }
          : d
      ));

      // Find the deliverable to get client info for notification
      const deliverable = deliverables.find(d => d.id === deliverableId);
      if (deliverable?.projects?.user_id) {
        await notifyClientOfDeliverable(
          deliverable.projects.user_id,
          deliverable.projects.name,
          deliverable.title
        );
      }

      toast({
        title: "Success",
        description: "Deliverable sent successfully",
      });

    } catch (error) {
      console.error('Error sending deliverable:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(null);
    }
  };

  // Bulk operations
  const bulkSendDeliverables = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedDeliverables);
      const unsentIds = selectedIds.filter(id => {
        const deliverable = deliverables.find(d => d.id === id);
        return deliverable && !deliverable.is_sent;
      });

      if (unsentIds.length === 0) {
        toast({
          title: "Info",
          description: "No unsent deliverables selected",
        });
        return;
      }

      const { error } = await supabase
        .from('deliverables')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .in('id', unsentIds);

      if (error) {
        console.error('Error bulk sending deliverables:', error);
        toast({
          title: "Error",
          description: "Failed to send some deliverables",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => prev.map(d =>
        unsentIds.includes(d.id)
          ? { ...d, is_sent: true, sent_at: new Date().toISOString() }
          : d
      ));

      // Send notifications
      for (const id of unsentIds) {
        const deliverable = deliverables.find(d => d.id === id);
        if (deliverable?.projects?.user_id) {
          await notifyClientOfDeliverable(
            deliverable.projects.user_id,
            deliverable.projects.name,
            deliverable.title
          );
        }
      }

      toast({
        title: "Success",
        description: `${unsentIds.length} deliverables sent successfully`,
      });

      setSelectedDeliverables(new Set());

    } catch (error) {
      console.error('Error bulk sending deliverables:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const bulkDeleteDeliverables = async () => {
    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedDeliverables);

      // Delete files from storage
      const filesToDelete = deliverables
        .filter(d => selectedIds.includes(d.id) && d.file_path)
        .map(d => d.file_path!);

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('deliverables')
          .remove(filesToDelete);
      }

      const { error } = await supabase
        .from('deliverables')
        .delete()
        .in('id', selectedIds);

      if (error) {
        console.error('Error bulk deleting deliverables:', error);
        toast({
          title: "Error",
          description: "Failed to delete some deliverables",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setDeliverables(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedDeliverables(new Set());

      toast({
        title: "Success",
        description: `${selectedIds.length} deliverables deleted successfully`,
      });

    } catch (error) {
      console.error('Error bulk deleting deliverables:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Deliverables Management</h2>
          <p className="text-muted-foreground">
            Manage all project deliverables across the platform
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Clear Filters
          </Button>
          
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-hover">
                <Plus className="h-4 w-4 mr-2" />
                Add Deliverable
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Deliverable</DialogTitle>
                <DialogDescription>
                  Add a new deliverable to the system
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name} - {project.client_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter deliverable title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter deliverable description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'url' | 'file') => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL Link</SelectItem>
                      <SelectItem value="file">File Upload</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'url' && (
                  <div className="space-y-2">
                    <Label htmlFor="url">URL *</Label>
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                )}

                {formData.type === 'file' && (
                  <div className="space-y-2">
                    <Label htmlFor="file">File *</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept=".zip,.rar,.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    />
                  </div>
                )}
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
                <Button onClick={createDeliverable}>
                  Create Deliverable
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Deliverable</DialogTitle>
            <DialogDescription>
              Update deliverable information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project">Project *</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="Enter deliverable title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Enter deliverable description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'url' | 'file') => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL Link</SelectItem>
                  <SelectItem value="file">File Upload</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'url' && (
              <div className="space-y-2">
                <Label htmlFor="edit-url">URL *</Label>
                <Input
                  id="edit-url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                />
              </div>
            )}

            {formData.type === 'file' && (
              <div className="space-y-2">
                <Label htmlFor="edit-file">Replace File (optional)</Label>
                <Input
                  id="edit-file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".zip,.rar,.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                />
                {editingDeliverable?.file_path && (
                  <p className="text-xs text-muted-foreground">
                    Current file: {editingDeliverable.file_path.split('/').pop()}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsEditModalOpen(false);
                setEditingDeliverable(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateDeliverable}>
              Update Deliverable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">{deliverables.length}</p>
                <p className="text-sm text-muted-foreground">Total Deliverables</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Send className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {deliverables.filter(d => d.is_sent).length}
                </p>
                <p className="text-sm text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {deliverables.filter(d => !d.is_sent).length}
                </p>
                <p className="text-sm text-muted-foreground">Draft</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {deliverables.filter(d => d.deliverable_type === 'file').length}
                </p>
                <p className="text-sm text-muted-foreground">Files</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
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
              placeholder="Search deliverables, projects, or clients..."
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="url">URLs</SelectItem>
              </SelectContent>
            </Select>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name} {client.company_name && `(${client.company_name})`}
                  </SelectItem>
                ))}
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
                {filteredDeliverables.length} of {deliverables.length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Operations */}
      {selectedDeliverables.size > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedDeliverables.size === filteredDeliverables.length}
                  onCheckedChange={selectAllDeliverables}
                />
                <span className="text-sm font-medium">
                  {selectedDeliverables.size} selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBulkOperating}
                  onClick={bulkSendDeliverables}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Selected
                </Button>

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
                      <AlertDialogTitle>Delete Selected Deliverables</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedDeliverables.size} selected deliverables? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={bulkDeleteDeliverables}
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
                  onClick={() => setSelectedDeliverables(new Set())}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Deliverables</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedDeliverables.size === filteredDeliverables.length && filteredDeliverables.length > 0}
                onCheckedChange={selectAllDeliverables}
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
          ) : filteredDeliverables.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No deliverables found
              </h3>
              <p className="text-muted-foreground">
                {deliverables.length === 0
                  ? "No deliverables have been created yet"
                  : "No deliverables match your current filters"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeliverables.map((deliverable) => (
                <div
                  key={deliverable.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedDeliverables.has(deliverable.id)}
                      onCheckedChange={() => toggleSelectDeliverable(deliverable.id)}
                      className="mt-1"
                    />

                    <div className="flex-1 space-y-2">
                      {/* Header Row */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {deliverable.deliverable_type === 'url' ? (
                            <Globe className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-500" />
                          )}
                          <h3 className="font-semibold text-foreground">
                            {deliverable.title}
                          </h3>
                          <Badge
                            variant={deliverable.is_sent ? "default" : "secondary"}
                            className={deliverable.is_sent ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                          >
                            {deliverable.is_sent ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sent
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Draft
                              </>
                            )}
                          </Badge>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingDeliverable(deliverable);
                              setFormData({
                                title: deliverable.title,
                                description: deliverable.description,
                                type: deliverable.deliverable_type as 'url' | 'file',
                                url: deliverable.deliverable_url || '',
                                file: null,
                                projectId: deliverable.project_id
                              });
                              setIsEditModalOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {!deliverable.is_sent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSending === deliverable.id}
                              onClick={() => sendDeliverable(deliverable.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isDeleting === deliverable.id}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Deliverable</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{deliverable.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteDeliverable(deliverable.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Description */}
                      {deliverable.description && (
                        <p className="text-sm text-muted-foreground">
                          {deliverable.description}
                        </p>
                      )}

                      {/* Project and Client Info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          <span>{deliverable.projects?.name || 'Unknown Project'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>
                            {deliverable.projects?.users?.full_name || 'Unknown Client'}
                            {deliverable.projects?.users?.company_name &&
                              ` (${deliverable.projects.users.company_name})`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {deliverable.is_sent && deliverable.sent_at
                              ? `Sent ${new Date(deliverable.sent_at).toLocaleDateString()}`
                              : `Created ${new Date(deliverable.created_at).toLocaleDateString()}`
                            }
                          </span>
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
  );
};

export default AdminDeliverableManager;
