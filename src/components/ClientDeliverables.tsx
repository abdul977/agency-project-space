import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  ExternalLink, 
  Download, 
  Calendar,
  FileText,
  Globe,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [isLoading, setIsLoading] = useState(true);

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
          .select('id')
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
          return;
        }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = (deliverable: Deliverable) => {
    const type = getDeliverableType(deliverable);
    const url = deliverable.deliverable_url || (type === 'url' ? deliverable.content : null);
    const filePath = deliverable.file_path || (type === 'file' ? deliverable.content : null);

    if (type === 'url' && url) {
      window.open(url, '_blank');
    } else if (type === 'file' && filePath) {
      // In a real implementation, this would download the file from Supabase Storage
      toast({
        title: "Download",
        description: "File download would start here",
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

      {deliverables.length === 0 ? (
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
          {deliverables.map((deliverable) => (
            <Card key={deliverable.id} className="border-border-light hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                {/* Mobile Layout */}
                <div className="sm:hidden space-y-3">
                  <div className="flex items-start justify-between gap-2">
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
                  <div className="flex items-start justify-between">
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
