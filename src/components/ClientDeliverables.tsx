import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Package,
  ExternalLink,
  Download,
  Calendar,
  FileText,
  Globe,
  CheckCircle,
  Search,
  Filter,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import SecurityManager from '@/lib/security';

interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  deliverable_type?: 'url' | 'file' | string;
  deliverable_url?: string;
  file_path?: string;
  is_sent?: boolean;
  created_at: string;
  sent_at?: string;
  type?: 'url' | 'file' | string;
  content?: string;
  delivered_at?: string;
  projects?: {
    name: string;
  };
}

const ClientDeliverables = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<Deliverable[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
  const [selectedDeliverables, setSelectedDeliverables] = useState<Set<string>>(new Set());
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  // Helper function to safely get deliverable type
  const getDeliverableType = (deliverable: Deliverable): 'url' | 'file' => {
    const type = deliverable.deliverable_type || deliverable.type;
    return (type === 'url' || type === 'file') ? type : 'url'; // Default to 'url' if unknown
  };

  useEffect(() => {
    const fetchDeliverables = async () => {
      if (!user) return;

      try {
        // First get user's projects
        const { data: userProjects, error: projectsError } = await supabase
          .from('projects')
          .select('id, name')
          .eq('user_id', user.id);

        if (projectsError) {
          console.error('Error fetching user projects:', projectsError);
          toast({
            title: "Error",
            description: "Failed to load projects",
            variant: "destructive",
          });
          return;
        }

        if (!userProjects || userProjects.length === 0) {
          setDeliverables([]);
          setProjects([]);
          return;
        }

        // Set projects for filter dropdown
        setProjects(userProjects.map(p => ({ id: p.id, name: p.name })));
        const projectIds = userProjects.map(p => p.id);

        // Then get deliverables for those projects
        const { data, error } = await supabase
          .from('deliverables')
          .select(`
            *,
            projects(name)
          `)
          .in('project_id', projectIds)
          .eq('is_sent', true)
          .order('sent_at', { ascending: false });

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
  }, [user, toast]);

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

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(deliverable => {
        const type = getDeliverableType(deliverable);
        return type === typeFilter;
      });
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(deliverable => deliverable.project_id === projectFilter);
    }

    setFilteredDeliverables(filtered);
  }, [deliverables, searchTerm, typeFilter, projectFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setProjectFilter('all');
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

  const bulkDownloadDeliverables = async () => {
    if (selectedDeliverables.size === 0) return;

    setIsBulkOperating(true);
    try {
      const selectedDeliverableObjects = filteredDeliverables.filter(d =>
        selectedDeliverables.has(d.id)
      );

      for (const deliverable of selectedDeliverableObjects) {
        await handleDownload(deliverable);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (deliverable: Deliverable) => {
    if (!user) return;

    // Check rate limiting
    if (!SecurityManager.checkDownloadRateLimit(user.id)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many download attempts. Please wait a moment before trying again.",
        variant: "destructive",
      });
      return;
    }

    // Verify user has access to this deliverable
    const canAccess = await SecurityManager.canAccessDeliverable(user.id, deliverable.id);
    if (!canAccess) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this deliverable",
        variant: "destructive",
      });
      return;
    }

    const type = getDeliverableType(deliverable);
    const url = deliverable.deliverable_url || (type === 'url' ? deliverable.content : null);
    const filePath = deliverable.file_path || (type === 'file' ? deliverable.content : null);

    if (type === 'url' && url) {
      window.open(url, '_blank');
    } else if (type === 'file' && filePath) {
      try {
        // First check if the file exists in storage
        const { error: listError } = await supabase.storage
          .from('deliverables')
          .list('', {
            search: filePath.split('/').pop() // Get just the filename
          });

        if (listError) {
          console.error('Error checking file existence:', listError);
        }

        // Try to generate signed URL for secure download
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('deliverables')
          .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);

          // Check if it's a "Object not found" error
          if (signedUrlError.message?.includes('Object not found')) {
            toast({
              title: "File Not Found",
              description: "The file is no longer available for download. Please contact support.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Download Error",
              description: `Failed to generate download link: ${signedUrlError.message}`,
              variant: "destructive",
            });
          }
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
          description: "Failed to download file. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } else {
      // No valid file path or URL found
      toast({
        title: "Download Unavailable",
        description: "This deliverable doesn't have a valid download link.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border-light">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading deliverables...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center sm:text-left">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Your Deliverables</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Access your completed project deliverables
        </p>
      </div>

      {/* Filter Section */}
      {deliverables.length > 0 && (
        <Card className="border-border-light">
          <CardContent className="p-4 sm:p-6">
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

              {/* Project Filter */}
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(searchTerm || typeFilter !== 'all' || projectFilter !== 'all') && (
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
          <CardContent className="p-4 sm:p-6">
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
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredDeliverables.length === 0 && deliverables.length > 0 ? (
        <Card className="border-border-light">
          <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
            <Filter className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              No deliverables match your filters
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : deliverables.length === 0 ? (
        <Card className="border-border-light">
          <CardContent className="py-8 sm:py-12 text-center px-4 sm:px-6">
            <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
              No deliverables yet
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Your completed project deliverables will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4 lg:gap-6">
          {filteredDeliverables.map((deliverable) => (
            <Card key={deliverable.id} className="border-border-light hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedDeliverables.has(deliverable.id)}
                      onCheckedChange={() => toggleSelectDeliverable(deliverable.id)}
                      className="mt-1"
                    />
                    <div className="flex items-start justify-between gap-2 flex-1">
                      <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {getDeliverableType(deliverable) === 'url' ? (
                          <Globe className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <h3 className="font-semibold text-foreground text-sm truncate">
                          {deliverable.title}
                        </h3>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs shrink-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      {getDeliverableType(deliverable) === 'url' ? 'Website' : 'File'}
                    </Badge>

                    <p className="text-xs text-muted-foreground">
                      Project: {deliverable.projects?.name || 'Unknown Project'}
                    </p>

                    {(deliverable.description || deliverable.content) && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {deliverable.description || deliverable.content}
                      </p>
                    )}

                    {(deliverable.deliverable_url || (getDeliverableType(deliverable) === 'url' && deliverable.content)) && (
                      <div className="flex items-center space-x-1">
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs text-primary font-medium truncate">
                          {deliverable.deliverable_url || deliverable.content}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1 shrink-0" />
                      <span className="truncate">
                        Delivered {(deliverable.sent_at || deliverable.delivered_at) ? formatDate(deliverable.sent_at || deliverable.delivered_at!) : 'Unknown'}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleDownload(deliverable)}
                    className="bg-primary hover:bg-primary-hover w-full text-sm"
                  >
                    {getDeliverableType(deliverable) === 'url' ? (
                      <>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Site
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:block">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedDeliverables.has(deliverable.id)}
                      onCheckedChange={() => toggleSelectDeliverable(deliverable.id)}
                      className="mt-1"
                    />
                    <div className="flex items-start justify-between flex-1">
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex items-center space-x-2">
                          {getDeliverableType(deliverable) === 'url' ? (
                            <Globe className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-500" />
                          )}
                          <h3 className="font-semibold text-foreground truncate">
                            {deliverable.title}
                          </h3>
                        </div>

                        <Badge variant="default" className="bg-green-100 text-green-800 shrink-0">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Delivered
                        </Badge>

                        <Badge variant="outline">
                          {getDeliverableType(deliverable) === 'url' ? 'Website' : 'File'}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3">
                        Project: {deliverable.projects?.name || 'Unknown Project'}
                      </p>

                      {(deliverable.description || deliverable.content) && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {deliverable.description || deliverable.content}
                        </p>
                      )}

                      {(deliverable.deliverable_url || (getDeliverableType(deliverable) === 'url' && deliverable.content)) && (
                        <div className="flex items-center space-x-2 mb-3">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-primary font-medium truncate">
                            {deliverable.deliverable_url || deliverable.content}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3 mr-1" />
                        Delivered {(deliverable.sent_at || deliverable.delivered_at) ? formatDate(deliverable.sent_at || deliverable.delivered_at!) : 'Unknown'}
                      </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        onClick={() => handleDownload(deliverable)}
                        className="bg-primary hover:bg-primary-hover"
                      >
                        {getDeliverableType(deliverable) === 'url' ? (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit Site
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </>
                        )}
                      </Button>
                    </div>
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

export default ClientDeliverables;
