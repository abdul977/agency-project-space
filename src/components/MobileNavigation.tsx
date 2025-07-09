import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Menu, 
  X, 
  Home, 
  Folder, 
  MessageSquare, 
  Package, 
  Settings, 
  LogOut,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationDropdown from '@/components/NotificationDropdown';

interface MobileNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onTabChange,
  onLogout
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'deliverables', label: 'Deliverables', icon: Package },
    { id: 'profile', label: 'Profile', icon: Settings },
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border-light">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              
              <SheetContent side="left" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="p-6 border-b border-border-light">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.full_name ? getInitials(user.full_name) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {user?.full_name || 'User'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {user?.company_name || 'Company'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Items */}
                  <div className="flex-1 p-4">
                    <nav className="space-y-2">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Button
                            key={item.id}
                            variant={activeTab === item.id ? 'default' : 'ghost'}
                            className="w-full justify-start h-12"
                            onClick={() => handleTabChange(item.id)}
                          >
                            <Icon className="h-5 w-5 mr-3" />
                            {item.label}
                          </Button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-border-light">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        onLogout();
                        setIsOpen(false);
                      }}
                    >
                      <LogOut className="h-5 w-5 mr-3" />
                      Logout
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-lg font-bold text-foreground">
                Muahib Solution
              </h1>
              <Badge variant="secondary" className="text-xs">
                Client Portal
              </Badge>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex items-center space-x-2">
            <NotificationDropdown />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation (Alternative) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border-light">
        <div className="grid grid-cols-4 gap-1 p-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={activeTab === item.id ? 'default' : 'ghost'}
                className="flex flex-col items-center justify-center h-16 text-xs"
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileNavigation;
