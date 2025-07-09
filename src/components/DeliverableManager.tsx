import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Edit
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { notifyClientOfDeliverable } from '@/lib/notifications';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
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

      if (formData.type === 'file' && !formData.file) {
        toast({
          title: "Error",
          description: "File is required for file deliverables",
          variant: "destructive",
        });
        return;
      }

      let filePath = null;
      if (formData.type === 'file' && formData.file) {
        // In a real implementation, upload the file to Supabase Storage
        // For demo purposes, we'll just use the filename
        filePath = `deliverables/${Date.now()}-${formData.file.name}`;
      }

      const { data: deliverable, error } = await supabase
        .from('deliverables')
        .insert({
          project_id: projectId,
          title: formData.title.trim(),
          description: formData.description.trim(),
          deliverable_type: formData.type,
          deliverable_url: formData.type === 'url' ? formData.url.trim() : null,
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

  const deleteDeliverable = async (deliverableId: string) => {
    try {
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

      {/* Deliverables List */}
      {deliverables.length === 0 ? (
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
          {deliverables.map((deliverable) => (
            <Card key={deliverable.id} className="border-border-light">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
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
