import React, { useState, useRef } from 'react';
import { BookOpen, Sparkles, Bell, Trash2 } from 'lucide-react';
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

const SWIPE_THRESHOLD = 80;

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);

  const timeAgo = formatDistanceToNow(new Date(notification.sent_at), {
    addSuffix: true,
    locale: fr
  });

  // Handle tap to mark as read
  const handleClick = () => {
    if (!isSwiping && !notification.is_read && Math.abs(translateX) < 10) {
      onMarkAsRead(notification.id);
    }
  };

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // Only allow swipe left (negative direction)
    if (diff < 0) {
      setIsSwiping(true);
      const newTranslateX = Math.max(diff + currentXRef.current, -150);
      setTranslateX(newTranslateX);
    } else if (currentXRef.current < 0) {
      // Allow swiping back to the right
      setIsSwiping(true);
      const newTranslateX = Math.min(diff + currentXRef.current, 0);
      setTranslateX(newTranslateX);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(translateX) > SWIPE_THRESHOLD) {
      // Delete with animation
      setTranslateX(-300);
      setTimeout(() => {
        onDelete(notification.id);
      }, 200);
    } else {
      // Snap back
      setTranslateX(0);
    }
    
    setTimeout(() => setIsSwiping(false), 50);
  };

  // Mouse handlers for desktop drag
  const handleMouseDown = (e: React.MouseEvent) => {
    startXRef.current = e.clientX;
    currentXRef.current = translateX;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      if (diff < 0) {
        setIsSwiping(true);
        const newTranslateX = Math.max(diff + currentXRef.current, -150);
        setTranslateX(newTranslateX);
      } else if (currentXRef.current < 0) {
        setIsSwiping(true);
        const newTranslateX = Math.min(diff + currentXRef.current, 0);
        setTranslateX(newTranslateX);
      }
    };

    const handleMouseUp = () => {
      if (Math.abs(translateX) > SWIPE_THRESHOLD) {
        setTranslateX(-300);
        setTimeout(() => {
          onDelete(notification.id);
        }, 200);
      } else {
        setTranslateX(0);
      }
      setTimeout(() => setIsSwiping(false), 50);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Delete background (revealed on swipe) */}
      <div 
        className="absolute inset-y-0 right-0 flex items-center justify-end bg-destructive px-6"
        style={{ width: Math.abs(translateX) + 20 }}
      >
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>

      {/* Main content (slides) */}
      <div
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s ease-out'
        }}
        className={cn(
          "relative flex items-start gap-3 p-3 rounded-lg cursor-pointer select-none bg-background",
          !notification.is_read 
            ? "bg-primary/5 hover:bg-primary/10" 
            : "hover:bg-muted/50"
        )}
      >
        {/* Unread indicator */}
        <div className="flex-shrink-0 mt-1">
          {!notification.is_read ? (
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          ) : (
            <div className="h-2 w-2" />
          )}
        </div>

        {/* Type icon */}
        <div className={cn(
          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
          !notification.is_read 
            ? "bg-primary/10 text-primary" 
            : "bg-muted text-muted-foreground"
        )}>
          {getNotificationIcon(notification.notification_type)}
        </div>

        {/* Content */}
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

        {/* Swipe hint indicator */}
        {translateX < -10 && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50">
            ← Supprimer
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
