import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Send,
  ExternalLink,
  FileText,
  Calendar,
  User,
  Package,
  Trash2,
  Edit,
  Download,
  Search,
  Filter,
  X
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
  type?: string;
}

interface DeliverableManagerProps {
  projectId: string;
  clientId: string;
  clientName: string;
  projectName: string;
}

const DeliverableManager: React.FC<DeliverableManagerProps> = ({
  projectId,
  clientId,
  clientName,
  projectName
}) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'url' as 'url' | 'file',
    url: '',
    file: null as File | null
  });
  const { toast } = useToast();

  // Fetch deliverables
  useEffect(() => {
    const fetchDeliverables = async () => {
      try {
        const { data, error } = await supabase
          .from('deliverables')
          .select('*')
          .eq('project_id', projectId)
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
        }
      } catch (error) {
        console.error('Error fetching deliverables:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliverables();
  }, [projectId, toast]);

  // Filter deliverables based on search and filters
  useEffect(() => {
    let filtered = deliverables;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(deliverable =>
        deliverable.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (deliverable.description && deliverable.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(deliverable => {
        if (statusFilter === 'sent') return deliverable.is_sent;
        if (statusFilter === 'draft') return !deliverable.is_sent;
        return true;
      });
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(deliverable => deliverable.deliverable_type === typeFilter);
    }

    setFilteredDeliverables(filtered);
  }, [deliverables, searchTerm, statusFilter, typeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const toggleSelectAll = () => {
    if (selectedDeliverables.size === filteredDeliverables.length) {
      setSelectedDeliverables(new Set());
    } else {
      setSelectedDeliverables(new Set(filteredDeliverables.map(d => d.id)));
    }
  };

  const toggleSelectDeliverable = (id: string) => {
    const newSelected = new Set(selectedDeliverables);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDeliverables(newSelected);
  };

  const bulkSendDeliverables = async () => {
    if (selectedDeliverables.size === 0) return;

    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedDeliverables);
      const { error } = await supabase
        .from('deliverables')
        .update({
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .in('id', selectedIds)
        .eq('is_sent', false); // Only update unsent deliverables

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
        selectedIds.includes(d.id) && !d.is_sent
          ? { ...d, is_sent: true, sent_at: new Date().toISOString() }
          : d
      ));

      setSelectedDeliverables(new Set());
      toast({
        title: "Deliverables sent",
        description: `${selectedIds.length} deliverables have been sent to the client.`,
      });

    } catch (error) {
      console.error('Error bulk sending deliverables:', error);
      toast({
        title: "Error",
        description: "Failed to send deliverables",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const bulkDeleteDeliverables = async () => {
    if (selectedDeliverables.size === 0) return;

    setIsBulkOperating(true);
    try {
      const selectedIds = Array.from(selectedDeliverables);
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
        title: "Deliverables deleted",
        description: `${selectedIds.length} deliverables have been deleted.`,
      });

    } catch (error) {
      console.error('Error bulk deleting deliverables:', error);
      toast({
        title: "Error",
        description: "Failed to delete deliverables",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const bulkDownloadDeliverables = async () => {
    if (selectedDeliverables.size === 0) return;

    setIsBulkOperating(true);
    try {
      const selectedDeliverableObjects = filteredDeliverables.filter(d =>
        selectedDeliverables.has(d.id)
      );

      for (const deliverable of selectedDeliverableObjects) {
        await downloadDeliverable(deliverable);
        // Add small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Downloads started",
        description: `Started downloading ${selectedDeliverableObjects.length} deliverables.`,
      });

    } catch (error) {
      console.error('Error bulk downloading deliverables:', error);
      toast({
        title: "Error",
        description: "Failed to download some deliverables",
        variant: "destructive",
      });
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, file }));
  };

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

      if (formData.type === 'file' && !formData.file) {
        toast({
          title: "Error",
          description: "File is required for file deliverables",
          variant: "destructive",
        });
        return;
      }

      // Validate file if provided
      if (formData.type === 'file' && formData.file) {
        const fileValidation = SecurityManager.validateFileUpload(formData.file);
        if (!fileValidation.valid) {
          toast({
            title: "Invalid File",
            description: fileValidation.error,
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
          filePath = `deliverables/${projectId}/${fileName}`;

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
              description: "Failed to upload file. Please try again.",
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

      const { data: deliverable, error } = await supabase
        .from('deliverables')
        .insert({
          project_id: projectId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          deliverable_type: formData.type,
          deliverable_url: formData.type === 'url' ? formData.url.trim() : fileUrl,
          file_path: filePath,
          is_sent: false
        })
        .select()
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

      setDeliverables(prev => [deliverable, ...prev]);
      setFormData({
        title: '',
        description: '',
        type: 'url',
        url: '',
        file: null
      });
      setIsCreateModalOpen(false);

      toast({
        title: "Deliverable created",
        description: "Deliverable has been created successfully",
      });

    } catch (error) {
      console.error('Error creating deliverable:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

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

      // Find the deliverable to get its title
      const deliverable = deliverables.find(d => d.id === deliverableId);
      if (deliverable) {
        // Send notification to client
        await notifyClientOfDeliverable(
          clientId,
          projectName,
          deliverable.title
        );
      }

      toast({
        title: "Deliverable sent",
        description: `Deliverable has been sent to ${clientName}`,
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

  const downloadDeliverable = async (deliverable: Deliverable) => {
    // Check rate limiting
    if (!SecurityManager.checkDownloadRateLimit(clientId)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many download attempts. Please wait a moment before trying again.",
        variant: "destructive",
      });
      return;
    }

    if (deliverable.deliverable_type === 'url' && deliverable.deliverable_url) {
      window.open(deliverable.deliverable_url, '_blank');
      return;
    }

    if (deliverable.deliverable_type === 'file' && deliverable.file_path) {
      try {
        // Generate signed URL for secure download
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('deliverables')
          .createSignedUrl(deliverable.file_path, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
          toast({
            title: "Download Error",
            description: "Failed to generate download link",
            variant: "destructive",
          });
          return;
        }

        // Create download link and trigger download
        const link = document.createElement('a');
        link.href = signedUrlData.signedUrl;
        link.download = deliverable.title || 'download';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download Started",
          description: `Downloading ${deliverable.title}`,
        });
      } catch (error) {
        console.error('Error downloading file:', error);
        toast({
          title: "Download Error",
          description: "Failed to download file",
          variant: "destructive",
        });
      }
    }
  };

  const deleteDeliverable = async (deliverableId: string) => {
    try {
      // Security check: Verify user has permission to delete this deliverable
      const canDelete = await SecurityManager.canDeleteDeliverable(clientId, deliverableId);
      if (!canDelete) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to delete this deliverable",
          variant: "destructive",
        });
        return;
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

      setDeliverables(prev => prev.filter(d => d.id !== deliverableId));
      toast({
        title: "Deliverable deleted",
        description: "Deliverable has been deleted successfully",
      });

    } catch (error) {
      console.error('Error deleting deliverable:', error);
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

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading deliverables...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Project Deliverables</h3>
          <p className="text-sm text-muted-foreground">
            Manage and send deliverables to {clientName}
          </p>
        </div>
        
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
                Add a new deliverable for this project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Website Live Version"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the deliverable..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'url' | 'file') => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">Website URL</SelectItem>
                    <SelectItem value="file">File Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'url' && (
                <div className="space-y-2">
                  <Label htmlFor="url">URL *</Label>
                  <Input
                    id="url"
                    name="url"
                    type="url"
                    value={formData.url}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
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
                    accept=".zip,.rar,.pdf,.doc,.docx"
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
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

      {/* Filter Section */}
      {deliverables.length > 0 && (
        <Card className="border-border-light">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deliverables..."
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
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="url">URLs</SelectItem>
                  <SelectItem value="file">Files</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
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

      {/* Bulk Actions Toolbar */}
      {filteredDeliverables.length > 0 && (
        <Card className="border-border-light">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedDeliverables.size === filteredDeliverables.length && filteredDeliverables.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedDeliverables.size > 0
                    ? `${selectedDeliverables.size} selected`
                    : 'Select all'
                  }
                </span>
              </div>

              {selectedDeliverables.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkSendDeliverables}
                    disabled={isBulkOperating}
                  >
                    {isBulkOperating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkDownloadDeliverables}
                    disabled={isBulkOperating}
                  >
                    {isBulkOperating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkDeleteDeliverables}
                    disabled={isBulkOperating}
                    className="text-red-600 hover:text-red-700"
                  >
                    {isBulkOperating ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliverables List */}
      {filteredDeliverables.length === 0 && deliverables.length > 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No deliverables match your filters
            </h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : deliverables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No deliverables yet
            </h3>
            <p className="text-muted-foreground">
              Create your first deliverable to share with the client
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDeliverables.map((deliverable) => (
            <Card key={deliverable.id} className="border-border-light">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedDeliverables.has(deliverable.id)}
                    onCheckedChange={() => toggleSelectDeliverable(deliverable.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-semibold text-foreground">
                        {deliverable.title}
                      </h4>
                      <Badge variant={deliverable.is_sent ? "default" : "secondary"}>
                        {deliverable.is_sent ? "Sent" : "Draft"}
                      </Badge>
                      <Badge variant="outline">
                        {deliverable.deliverable_type === 'url' ? 'URL' : 'File'}
                      </Badge>
                    </div>
                    
                    {deliverable.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {deliverable.description}
                      </p>
                    )}
                    
                    {deliverable.deliverable_url && (
                      <div className="flex items-center space-x-2 mb-3">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <a 
                          href={deliverable.deliverable_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {deliverable.deliverable_url}
                        </a>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Created {formatDate(deliverable.created_at)}
                      </span>
                      {deliverable.sent_at && (
                        <span className="flex items-center">
                          <Send className="h-3 w-3 mr-1" />
                          Sent {formatDate(deliverable.sent_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!deliverable.is_sent && (
                      <Button
                        size="sm"
                        onClick={() => sendDeliverable(deliverable.id)}
                        disabled={isSending === deliverable.id}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        {isSending === deliverable.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send to Client
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadDeliverable(deliverable)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {deliverable.deliverable_type === 'url' ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteDeliverable(deliverable.id)}
                      className="text-red-600 hover:text-red-700"
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
  );
};

export default DeliverableManager;
