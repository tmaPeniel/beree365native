import React, { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from './NotificationBell';
import NotificationItem from './NotificationItem';

const NotificationCenter: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();

  const NotificationContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={markAllAsRead}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Liste */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            // Skeleton loading
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-2 w-2 rounded-full mt-2" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            // État vide
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Aucune notification
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Vous recevrez ici vos rappels de lecture
              </p>
            </div>
          ) : (
            // Liste des notifications
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  // Version mobile (Sheet)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <div>
            <NotificationBell 
              unreadCount={unreadCount} 
              onClick={() => setIsOpen(true)}
              isOpen={isOpen}
            />
          </div>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <NotificationContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Version desktop (Popover)
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div>
          <NotificationBell 
            unreadCount={unreadCount} 
            onClick={() => setIsOpen(true)}
            isOpen={isOpen}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 max-h-[400px] flex flex-col" 
        align="end"
        sideOffset={8}
      >
        <NotificationContent />
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
