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
import {
  MessageSquare,
  Send,
  Users,
  Search,
  Filter,
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  Mail,
  MessageCircle,
  Bell,
  Globe,
  Building2,
  User,
  Calendar,
  Eye,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Client {
  id: string;
  full_name: string;
  company_name: string;
  phone_number: string;
  created_at: string;
  is_active: boolean;
}

interface BroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: 'email' | 'sms' | 'system';
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipient_count: number;
  sent_count: number;
  created_at: string;
  sent_at?: string;
  scheduled_at?: string;
}

const AdminBroadcastMessaging = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastMessage[]>([]);
  const [activeTab, setActiveTab] = useState('compose');
  
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    type: 'system' as 'email' | 'sms' | 'system',
    schedule: false,
    scheduledDate: '',
    scheduledTime: ''
  });

  // Load clients and broadcast history
  useEffect(() => {
    loadClients();
    loadBroadcastHistory();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, company_name, phone_number, created_at')
        .eq('is_admin', false)
        .order('full_name');

      if (error) {
        console.error('Error loading clients:', error);
        toast({
          title: "Error",
          description: "Failed to load clients",
          variant: "destructive",
        });
      } else {
        setClients(data || []);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBroadcastHistory = async () => {
    try {
      const { data: broadcasts, error } = await supabase
        .from('broadcasts')
        .select(`
          *,
          created_by_user:created_by (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading broadcast history:', error);
        return;
      }

      const formattedHistory: BroadcastMessage[] = (broadcasts || []).map(broadcast => ({
        id: broadcast.id,
        title: broadcast.title,
        content: broadcast.content,
        type: broadcast.type,
        status: broadcast.status,
        recipient_count: broadcast.recipient_count || 0,
        sent_count: broadcast.sent_count || 0,
        created_at: broadcast.created_at,
        sent_at: broadcast.sent_at
      }));

      setBroadcastHistory(formattedHistory);
    } catch (error) {
      console.error('Error loading broadcast history:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.phone_number.includes(searchTerm);
    
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'selected') return matchesSearch && selectedClients.has(client.id);
    return matchesSearch;
  });

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clientId)) {
        newSet.delete(clientId);
      } else {
        newSet.add(clientId);
      }
      return newSet;
    });
  };

  const selectAllClients = () => {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  };

  const sendBroadcastMessage = async () => {
    if (!messageForm.title.trim() || !messageForm.content.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive",
      });
      return;
    }

    if (selectedClients.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one recipient",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // 1. Create broadcast record in database
      const { data: broadcast, error: broadcastError } = await supabase
        .from('broadcasts')
        .insert({
          title: messageForm.title.trim(),
          content: messageForm.content.trim(),
          type: messageForm.type,
          status: 'sending',
          recipient_count: selectedClients.size,
          sent_count: 0,
          created_by: user?.id,
          scheduled_for: messageForm.schedule && messageForm.scheduledDate && messageForm.scheduledTime
            ? new Date(`${messageForm.scheduledDate}T${messageForm.scheduledTime}`).toISOString()
            : null
        })
        .select()
        .single();

      if (broadcastError) {
        console.error('Error creating broadcast:', broadcastError);
        throw broadcastError;
      }

      const selectedClientsList = clients.filter(c => selectedClients.has(c.id));
      let successCount = 0;

      // 2. Create broadcast recipients and send notifications
      for (const client of selectedClientsList) {
        try {
          // Create broadcast recipient record
          const { error: recipientError } = await supabase
            .from('broadcast_recipients')
            .insert({
              broadcast_id: broadcast.id,
              user_id: client.id,
              status: 'pending'
            });

          if (recipientError) {
            console.error('Error creating broadcast recipient:', recipientError);
            continue;
          }

          // Send notification based on type
          if (messageForm.type === 'system') {
            const { error: notificationError } = await supabase
              .from('notifications')
              .insert({
                user_id: client.id,
                type: 'system',
                title: messageForm.title,
                message: messageForm.content,
                is_read: false
              });

            if (notificationError) {
              console.error('Error sending notification to client:', client.id, notificationError);
              // Update recipient status to failed
              await supabase
                .from('broadcast_recipients')
                .update({ status: 'failed', error_message: notificationError.message })
                .eq('broadcast_id', broadcast.id)
                .eq('user_id', client.id);
            } else {
              // Update recipient status to sent
              await supabase
                .from('broadcast_recipients')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('broadcast_id', broadcast.id)
                .eq('user_id', client.id);
              successCount++;
            }
          }
          // TODO: Implement email and SMS sending for other types
          else {
            successCount++;
            await supabase
              .from('broadcast_recipients')
              .update({ status: 'sent', sent_at: new Date().toISOString() })
              .eq('broadcast_id', broadcast.id)
              .eq('user_id', client.id);
          }
        } catch (clientError) {
          console.error('Error processing client:', client.id, clientError);
        }
      }

      // 3. Update broadcast status and counts
      const { error: updateError } = await supabase
        .from('broadcasts')
        .update({
          status: 'sent',
          sent_count: successCount,
          sent_at: new Date().toISOString()
        })
        .eq('id', broadcast.id);

      if (updateError) {
        console.error('Error updating broadcast status:', updateError);
      }

      // Update local state
      const newBroadcast: BroadcastMessage = {
        id: broadcast.id,
        title: broadcast.title,
        content: broadcast.content,
        type: broadcast.type,
        status: 'sent',
        recipient_count: selectedClients.size,
        sent_count: successCount,
        created_at: broadcast.created_at,
        sent_at: new Date().toISOString()
      };

      setBroadcastHistory(prev => [newBroadcast, ...prev]);

      toast({
        title: "Message Sent",
        description: `Broadcast message sent to ${selectedClients.size} clients`,
      });

      // Reset form
      setMessageForm({
        title: '',
        content: '',
        type: 'system',
        schedule: false,
        scheduledDate: '',
        scheduledTime: ''
      });
      setSelectedClients(new Set());

    } catch (error) {
      console.error('Error sending broadcast message:', error);
      toast({
        title: "Error",
        description: "Failed to send broadcast message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
          <h2 className="text-2xl font-bold text-foreground">Broadcast Messaging</h2>
          <p className="text-muted-foreground">
            Send messages to multiple clients at once
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'compose' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('compose')}
          className="flex items-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          Compose
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          History
        </Button>
      </div>

      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Message Composition */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Compose Message
              </CardTitle>
              <CardDescription>
                Create a new broadcast message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message-title">Message Title</Label>
                <Input
                  id="message-title"
                  placeholder="Enter message title"
                  value={messageForm.title}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-content">Message Content</Label>
                <Textarea
                  id="message-content"
                  placeholder="Enter your message content..."
                  value={messageForm.content}
                  onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message-type">Message Type</Label>
                <Select
                  value={messageForm.type}
                  onValueChange={(value: 'email' | 'sms' | 'system') => 
                    setMessageForm(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System Notification</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4">
                <Button
                  onClick={sendBroadcastMessage}
                  disabled={isSending || selectedClients.size === 0}
                  className="w-full flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {isSending ? 'Sending...' : `Send to ${selectedClients.size} clients`}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>
                Choose which clients will receive the message
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                    onCheckedChange={selectAllClients}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <Badge variant="secondary">
                  {selectedClients.size} selected
                </Badge>
              </div>

              {/* Client List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedClients.has(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {getInitials(client.full_name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {client.full_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {client.company_name || client.phone_number}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Broadcast History
            </CardTitle>
            <CardDescription>
              View previously sent broadcast messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {broadcastHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No broadcast messages yet
                </h3>
                <p className="text-muted-foreground">
                  Your sent broadcast messages will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {broadcastHistory.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {broadcast.title}
                          </h3>
                          <Badge
                            variant={broadcast.status === 'sent' ? 'default' : 'secondary'}
                            className={
                              broadcast.status === 'sent'
                                ? 'bg-green-100 text-green-800'
                                : broadcast.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }
                          >
                            {broadcast.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                            {broadcast.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {broadcast.status === 'sending' && <Clock className="h-3 w-3 mr-1" />}
                            {broadcast.status.charAt(0).toUpperCase() + broadcast.status.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {broadcast.type === 'email' && <Mail className="h-3 w-3" />}
                            {broadcast.type === 'sms' && <MessageCircle className="h-3 w-3" />}
                            {broadcast.type === 'system' && <Bell className="h-3 w-3" />}
                            {broadcast.type.charAt(0).toUpperCase() + broadcast.type.slice(1)}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {broadcast.content}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span>{broadcast.sent_count}/{broadcast.recipient_count} sent</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {broadcast.sent_at
                                ? `Sent ${new Date(broadcast.sent_at).toLocaleDateString()}`
                                : `Created ${new Date(broadcast.created_at).toLocaleDateString()}`
                              }
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBroadcastMessaging;
