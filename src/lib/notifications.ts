import { supabase } from '@/integrations/supabase/client';
import { publishNotification } from '@/lib/redis';

export interface NotificationData {
  user_id: string;
  type: string;
  title: string;
  message: string;
}

// Create and send notification
export const createNotification = async (data: NotificationData): Promise<boolean> => {
  try {
    // Save to database
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: data.user_id,
        type: data.type,
        title: data.title,
        message: data.message,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return false;
    }

    // Publish real-time notification
    await publishNotification(data.user_id, notification);
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Notify admin when client updates content
export const notifyAdminOfClientUpdate = async (
  clientName: string,
  projectName: string,
  updateType: 'project_created' | 'folder_created' | 'content_updated'
): Promise<void> => {
  try {
    // Get admin users
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_admin', true);

    if (error || !admins) {
      console.error('Error fetching admin users:', error);
      return;
    }

    // Create notification for each admin
    const notifications = admins.map(admin => {
      let title = '';
      let message = '';

      switch (updateType) {
        case 'project_created':
          title = 'New Project Created';
          message = `${clientName} created a new project: ${projectName}`;
          break;
        case 'folder_created':
          title = 'New Folder Added';
          message = `${clientName} added a new folder to ${projectName}`;
          break;
        case 'content_updated':
          title = 'Content Updated';
          message = `${clientName} updated content in ${projectName}`;
          break;
      }

      return createNotification({
        user_id: admin.id,
        type: updateType,
        title,
        message
      });
    });

    await Promise.all(notifications);
  } catch (error) {
    console.error('Error notifying admin of client update:', error);
  }
};

// Notify client of project status change
export const notifyClientOfStatusChange = async (
  clientId: string,
  projectName: string,
  newStatus: string
): Promise<void> => {
  try {
    const statusMessages = {
      starting: 'Your project is now in the starting phase',
      in_progress: 'Your project is now in progress',
      completed: 'Your project has been completed'
    };

    await createNotification({
      user_id: clientId,
      type: 'status_change',
      title: 'Project Status Updated',
      message: `${projectName}: ${statusMessages[newStatus as keyof typeof statusMessages] || 'Status updated'}`
    });
  } catch (error) {
    console.error('Error notifying client of status change:', error);
  }
};

// Notify client of new deliverable
export const notifyClientOfDeliverable = async (
  clientId: string,
  projectName: string,
  deliverableTitle: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: clientId,
      type: 'deliverable',
      title: 'New Deliverable Available',
      message: `${deliverableTitle} is ready for ${projectName}`
    });
  } catch (error) {
    console.error('Error notifying client of deliverable:', error);
  }
};

// Notify client of new message
export const notifyClientOfMessage = async (
  clientId: string,
  senderName: string
): Promise<void> => {
  try {
    await createNotification({
      user_id: clientId,
      type: 'message',
      title: 'New Message',
      message: `You have a new message from ${senderName}`
    });
  } catch (error) {
    console.error('Error notifying client of message:', error);
  }
};
