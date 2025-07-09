import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { subscribeToMessages, publishMessage } from '@/lib/redis';
import { notifyClientOfMessage } from '@/lib/notifications';

// Local storage utilities for client-side message persistence
const MESSAGES_STORAGE_KEY = 'client_messages';
const CONVERSATIONS_STORAGE_KEY = 'client_conversations';

const saveMessagesToStorage = (messages: Message[]) => {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Error saving messages to localStorage:', error);
  }
};

const loadMessagesFromStorage = (): Message[] => {
  try {
    const stored = localStorage.getItem(MESSAGES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading messages from localStorage:', error);
    return [];
  }
};

const saveConversationsToStorage = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
  } catch (error) {
    console.error('Error saving conversations to localStorage:', error);
  }
};

const loadConversationsFromStorage = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading conversations from localStorage:', error);
    return [];
  }
};

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    full_name: string;
    is_admin: boolean;
  };
}

export interface Conversation {
  user_id: string;
  user_name: string;
  user_company: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_admin: boolean;
}

export const useMessages = (conversationUserId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage());
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversationsFromStorage());
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Generate room ID for two users
  const getRoomId = useCallback((userId1: string, userId2: string) => {
    return [userId1, userId2].sort().join('-');
  }, []);

  // Fetch conversations (for admin)
  const fetchConversations = useCallback(async () => {
    if (!user?.is_admin) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          sender_id,
          receiver_id,
          content,
          created_at,
          is_read,
          sender:users!messages_sender_id_fkey(full_name, company_name, is_admin),
          receiver:users!messages_receiver_id_fkey(full_name, company_name, is_admin)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        return;
      }

      // Group messages by conversation
      const conversationMap = new Map<string, Conversation>();

      data?.forEach((message: any) => {
        const otherUser = message.sender.is_admin ? message.receiver : message.sender;
        const otherUserId = message.sender.is_admin ? message.receiver_id : message.sender_id;
        
        if (!otherUser.is_admin) {
          const existing = conversationMap.get(otherUserId);
          
          if (!existing || new Date(message.created_at) > new Date(existing.last_message_time)) {
            conversationMap.set(otherUserId, {
              user_id: otherUserId,
              user_name: otherUser.full_name || 'Unknown User',
              user_company: otherUser.company_name || '',
              last_message: message.content,
              last_message_time: message.created_at,
              unread_count: 0, // TODO: Calculate unread count
              is_admin: false
            });
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  }, [user]);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async () => {
    if (!user || !conversationUserId) return;

    try {
      // Try with foreign key join first, fallback to basic query if it fails
      let data, error;
      try {
        const result = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(full_name, is_admin)
          `)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        data = result.data;
        error = result.error;
      } catch (joinError) {
        console.warn('Foreign key join failed, falling back to basic query:', joinError);
        // Fallback to basic query without foreign key join
        const result = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true });

        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        const messagesData = data || [];
        setMessages(messagesData);
        saveMessagesToStorage(messagesData);

        // Mark messages as read
        const unreadMessages = messagesData.filter(msg =>
          msg.receiver_id === user.id && !msg.is_read
        );

        if (unreadMessages && unreadMessages.length > 0) {
          await supabase
            .from('messages')
            .update({ is_read: true })
            .in('id', unreadMessages.map(msg => msg.id));
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, conversationUserId]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!user || !conversationUserId) return;

    let subscriber: any = null;
    const roomId = getRoomId(user.id, conversationUserId);

    const setupSubscription = async () => {
      try {
        subscriber = await subscribeToMessages(roomId, (message) => {
          setMessages(prev => {
            const updatedMessages = [...prev, message];
            saveMessagesToStorage(updatedMessages);
            return updatedMessages;
          });
        });
      } catch (error) {
        console.error('Error setting up message subscription:', error);
      }
    };

    setupSubscription();
    fetchMessages();

    return () => {
      if (subscriber && subscriber.unsubscribe) {
        subscriber.unsubscribe();
      }
    };
  }, [user, conversationUserId, getRoomId, fetchMessages]);

  // Fetch conversations on mount (for admin)
  useEffect(() => {
    if (user?.is_admin && !conversationUserId) {
      fetchConversations();
      setIsLoading(false);
    }
  }, [user, conversationUserId, fetchConversations]);

  // Send message
  const sendMessage = async (content: string): Promise<boolean> => {
    if (!user || !content.trim()) return false;

    setIsSending(true);
    try {
      let receiverId: string;

      if (user.is_admin && conversationUserId) {
        // Admin sending to specific client
        receiverId = conversationUserId;
      } else {
        // Client sending to admin - get first admin user ID
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('is_admin', true)
          .limit(1);

        if (adminError || !adminUsers || adminUsers.length === 0) {
          console.error('Error finding admin user:', adminError);
          return false;
        }

        receiverId = adminUsers[0].id;
      }

      // Save to database
      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          content: content.trim(),
          is_read: false
        })
        .select(`
          *,
          sender:users!messages_sender_id_fkey(full_name, is_admin)
        `)
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return false;
      }

      // Add to local state and save to storage
      const updatedMessages = [...messages, message];
      setMessages(updatedMessages);
      saveMessagesToStorage(updatedMessages);

      // Publish real-time message
      const roomId = getRoomId(user.id, receiverId);
      await publishMessage(roomId, message);

      // Send notification to receiver
      await notifyClientOfMessage(
        receiverId,
        user.full_name || (user.is_admin ? 'Admin' : 'Client')
      );

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    } finally {
      setIsSending(false);
    }
  };

  return {
    messages,
    conversations,
    isLoading,
    isSending,
    sendMessage,
    refetchConversations: fetchConversations,
    refetchMessages: fetchMessages
  };
};
