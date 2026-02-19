import React from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isOpen?: boolean;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ unreadCount, onClick, isOpen }) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
    >
      <Bell 
        className={cn(
          "h-5 w-5 transition-colors",
          isOpen ? "text-primary" : "text-muted-foreground"
        )} 
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default NotificationBell;
