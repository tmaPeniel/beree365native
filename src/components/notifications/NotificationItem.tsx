import React from 'react';
import { BookOpen, Sparkles, Bell, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'reading_reminder':
      return <BookOpen className="h-4 w-4" />;
    case 'daily_verse':
      return <Sparkles className="h-4 w-4" />;
    case 'badge_encouragement':
      return <Bell className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.sent_at), {
    addSuffix: true,
    locale: fr
  });

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors group",
        !notification.is_read 
          ? "bg-primary/5 hover:bg-primary/10" 
          : "hover:bg-muted/50"
      )}
    >
      {/* Indicateur non lu */}
      <div className="flex-shrink-0 mt-1">
        {!notification.is_read ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      {/* Icône du type */}
      <div className={cn(
        "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
        !notification.is_read 
          ? "bg-primary/10 text-primary" 
          : "bg-muted text-muted-foreground"
      )}>
        {getNotificationIcon(notification.notification_type)}
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm leading-tight",
          !notification.is_read ? "font-medium text-foreground" : "text-muted-foreground"
        )}>
          {notification.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {timeAgo}
        </p>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            aria-label="Marquer comme lu"
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          aria-label="Supprimer"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default NotificationItem;
