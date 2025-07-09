import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare } from 'lucide-react';
import { useMessages, Message } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface MessageInterfaceProps {
  conversationUserId: string;
  conversationUserName: string;
  conversationUserCompany?: string;
}

const MessageInterface: React.FC<MessageInterfaceProps> = ({
  conversationUserId,
  conversationUserName,
  conversationUserCompany
}) => {
  const { user } = useAuth();
  const { messages, isLoading, isSending, sendMessage } = useMessages(conversationUserId);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest'
        });
      }
    };

    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'nearest'
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const success = await sendMessage(newMessage);
    if (success) {
      setNewMessage('');
      // Scroll to bottom after sending message
      setTimeout(scrollToBottom, 100);
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-80 sm:h-96 lg:h-[28rem] chat-container">
      <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 flex-shrink-0">
        <CardTitle className="flex items-center space-x-2 sm:space-x-3">
          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getInitials(conversationUserName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-medium truncate">{conversationUserName}</p>
            {conversationUserCompany && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{conversationUserCompany}</p>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="chat-messages p-0">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="h-full chat-scroll-area">
          <div className="px-3 sm:px-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8 min-h-[200px]">
                <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4" />
                <p className="text-sm sm:text-base text-muted-foreground">No messages yet</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message) => {
                  const isOwnMessage = message.sender_id === user?.id;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-start space-x-2 max-w-[70%] ${
                        isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarFallback className={`text-xs ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {message.sender?.full_name
                              ? getInitials(message.sender.full_name)
                              : (message.sender?.is_admin ? 'A' : 'U')
                            }
                          </AvatarFallback>
                        </Avatar>

                        <div className={`rounded-lg px-3 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isOwnMessage
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground'
                          }`}>
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t border-border-light p-3 sm:p-4 flex-shrink-0 bg-background">
          <form onSubmit={handleSendMessage} className="flex gap-2 sm:gap-3">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              disabled={isSending}
              className="flex-1 text-sm sm:text-base h-9 sm:h-10"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              size="sm"
              className="px-2 sm:px-3 h-9 sm:h-10 shrink-0"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};

export default MessageInterface;
