import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User,
  Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MessageInterface from '@/components/MessageInterface';

interface Client {
  id: string;
  full_name: string;
  company_name: string;
  phone_number: string;
  created_at: string;
  last_message?: {
    content: string;
    created_at: string;
    is_read: boolean;
  };
  unread_count: number;
}

const AdminMessaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch clients with message data
  useEffect(() => {
    const fetchClients = async () => {
      if (!user?.is_admin) return;

      try {
        // Get all non-admin users (clients)
        const { data: clientsData, error } = await supabase
          .from('users')
          .select('*')
          .eq('is_admin', false)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching clients:', error);
          toast({
            title: "Error",
            description: "Failed to load clients",
            variant: "destructive",
          });
          return;
        }

        // For each client, get their latest message and unread count
        const clientsWithMessages = await Promise.all(
          (clientsData || []).map(async (client) => {
            try {
              // Get latest message
              const { data: latestMessages, error: messageError } = await supabase
                .from('messages')
                .select('content, created_at, is_read')
                .or(`sender_id.eq.${client.id},receiver_id.eq.${client.id}`)
                .order('created_at', { ascending: false })
                .limit(1);

              if (messageError) {
                console.error('Error fetching latest message:', messageError);
              }

              // Get unread count (messages from client to admin that are unread)
              const { count: unreadCount, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', client.id)
                .eq('receiver_id', user.id)
                .eq('is_read', false);

              if (countError) {
                console.error('Error fetching unread count:', countError);
              }

              return {
                ...client,
                last_message: latestMessages && latestMessages.length > 0 ? latestMessages[0] : undefined,
                unread_count: unreadCount || 0
              };
            } catch (error) {
              console.error('Error processing client messages:', error);
              return {
                ...client,
                last_message: undefined,
                unread_count: 0
              };
            }
          })
        );

        setClients(clientsWithMessages);
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClients();
  }, [user, toast]);

  const filteredClients = clients.filter(client =>
    client.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone_number?.includes(searchTerm)
  );

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border-light">
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 container-safe">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground text-wrap">Client Messages</h2>
        <p className="text-sm sm:text-base text-muted-foreground text-wrap">
          Communicate with your clients
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-overflow">
        {/* Client List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-border-light">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-wrap">Clients</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-wrap-anywhere"
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-0 text-container-safe">
              <div className="max-h-96 overflow-y-auto">
                {filteredClients.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-wrap">No clients found</p>
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => setSelectedClient(client)}
                      className={`p-4 border-b border-border-light cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedClient?.id === client.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                            {getInitials(client.full_name || '')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-foreground truncate text-wrap">
                              {client.full_name || 'Unknown'}
                            </h4>
                            {client.unread_count > 0 && (
                              <Badge variant="default" className="ml-2 flex-shrink-0">
                                {client.unread_count}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground truncate text-wrap">
                            {client.company_name || client.phone_number}
                          </p>
                          
                          {client.last_message && (
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-xs text-muted-foreground truncate text-wrap">
                                {client.last_message.content}
                              </p>
                              <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                                {formatDate(client.last_message.created_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Interface */}
        <div className="lg:col-span-2">
          {selectedClient ? (
            <Card className="border-border-light h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedClient.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg text-wrap">{selectedClient.full_name}</CardTitle>
                    <CardDescription className="text-wrap">
                      {selectedClient.company_name} • {selectedClient.phone_number}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="text-container-safe">
                <MessageInterface
                  conversationUserId={selectedClient.id}
                  conversationUserName={selectedClient.full_name || 'Unknown User'}
                  conversationUserCompany={selectedClient.company_name}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border-light h-full">
              <CardContent className="py-12 text-center text-container-safe">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2 text-wrap">
                  Select a Client
                </h3>
                <p className="text-muted-foreground text-wrap">
                  Choose a client from the list to start messaging
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessaging;
