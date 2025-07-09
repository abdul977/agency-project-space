import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import MessageInterface from '@/components/MessageInterface';
import { formatDistanceToNow } from 'date-fns';

const Messages = () => {
  const { user } = useAuth();
  const { conversations, isLoading } = useMessages();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.user_company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedConversationData = conversations.find(conv => conv.user_id === selectedConversation);

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Access Denied
            </h3>
            <p className="text-muted-foreground mb-6">
              Only administrators can access the messaging system.
            </p>
            <Button asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading conversations...</p>
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
              <div>
                <h1 className="text-xl font-bold text-foreground">Messages</h1>
                <p className="text-sm text-muted-foreground">
                  Communicate with your clients
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Conversations</span>
                  <Badge variant="secondary">{conversations.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Select a client to start messaging
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Search */}
                <div className="p-4 border-b border-border-light">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Conversations */}
                <div className="flex-1 overflow-y-auto">
                  {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        {searchTerm ? 'No conversations found' : 'No conversations yet'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {filteredConversations.map((conversation) => (
                        <button
                          key={conversation.user_id}
                          onClick={() => setSelectedConversation(conversation.user_id)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedConversation === conversation.user_id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-10 w-10 flex-shrink-0">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {getInitials(conversation.user_name)}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground truncate">
                                  {conversation.user_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatTime(conversation.last_message_time)}
                                </p>
                              </div>
                              
                              <p className="text-sm text-muted-foreground truncate">
                                {conversation.user_company}
                              </p>
                              
                              <p className="text-sm text-muted-foreground truncate mt-1">
                                {conversation.last_message}
                              </p>
                              
                              {conversation.unread_count > 0 && (
                                <Badge variant="destructive" className="mt-1 text-xs">
                                  {conversation.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Message Interface */}
          <div className="lg:col-span-2">
            {selectedConversation && selectedConversationData ? (
              <MessageInterface
                conversationUserId={selectedConversation}
                conversationUserName={selectedConversationData.user_name}
                conversationUserCompany={selectedConversationData.user_company}
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Select a Conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a client from the list to start messaging
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
