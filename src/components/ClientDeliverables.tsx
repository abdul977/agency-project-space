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
    const type = deliverable.deliverable_type || deliverable.type;
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Deliverables</h2>
        <p className="text-muted-foreground">
          Access your completed project deliverables
        </p>
      </div>

      {deliverables.length === 0 ? (
        <Card className="border-border-light">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No deliverables yet
            </h3>
            <p className="text-muted-foreground">
              Your completed project deliverables will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {deliverables.map((deliverable) => (
            <Card key={deliverable.id} className="border-border-light hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {(deliverable.deliverable_type || deliverable.type) === 'url' ? (
                          <Globe className="h-5 w-5 text-blue-500" />
                        ) : (
                          <FileText className="h-5 w-5 text-green-500" />
                        )}
                        <h3 className="font-semibold text-foreground">
                          {deliverable.title}
                        </h3>
                      </div>

                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>

                      <Badge variant="outline">
                        {(deliverable.deliverable_type || deliverable.type) === 'url' ? 'Website' : 'File'}
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

                    {(deliverable.deliverable_url || ((deliverable.deliverable_type || deliverable.type) === 'url' && deliverable.content)) && (
                      <div className="flex items-center space-x-2 mb-3">
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-primary font-medium">
                          {deliverable.deliverable_url || deliverable.content}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Delivered {(deliverable.sent_at || deliverable.delivered_at) ? formatDate(deliverable.sent_at || deliverable.delivered_at!) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => handleDownload(deliverable)}
                      className="bg-primary hover:bg-primary-hover"
                    >
                      {(deliverable.deliverable_type || deliverable.type) === 'url' ? (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDeliverables;
