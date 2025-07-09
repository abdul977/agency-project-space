import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'project_update':
        return '📁';
      case 'message':
        return '💬';
      case 'status_change':
        return '🔄';
      case 'deliverable':
        return '📦';
      default:
        return '🔔';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-1.5 sm:p-2">
          <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 sm:w-80 lg:w-96 max-w-[90vw] bg-background border border-border shadow-lg backdrop-blur-sm">
        <DropdownMenuLabel className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
          <span className="text-sm sm:text-base font-medium">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-1 text-xs sm:text-sm"
            >
              <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-3 sm:p-4 text-center text-muted-foreground">
            <Bell className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="h-80 sm:h-96 max-h-[60vh]">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex flex-col items-start p-2 sm:p-3 cursor-pointer hover:bg-muted/50 border-b border-border-light last:border-b-0"
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between w-full gap-2">
                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                    <span className="text-base sm:text-lg shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <p className={`text-xs sm:text-sm font-medium truncate ${
                          notification.is_read ? 'text-muted-foreground' : 'text-foreground'
                        }`}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-2 ${
                        notification.is_read ? 'text-muted-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                  </div>

                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0.5 sm:p-1 ml-1 sm:ml-2 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                    >
                      <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="sr-only">Mark as read</span>
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center justify-center">
              <Button variant="ghost" size="sm" className="w-full">
                View all notifications
              </Button>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
