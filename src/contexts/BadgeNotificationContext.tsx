import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Badge } from '@/services/badgeService';

interface BadgeNotificationContextType {
  showBadgeUnlocked: (badge: Badge) => void;
  currentBadge: Badge | null;
  isVisible: boolean;
  dismissNotification: () => void;
}

const BadgeNotificationContext = createContext<BadgeNotificationContextType | undefined>(undefined);

export const useBadgeNotification = () => {
  const context = useContext(BadgeNotificationContext);
  if (!context) {
    throw new Error('useBadgeNotification must be used within BadgeNotificationProvider');
  }
  return context;
};

interface BadgeNotificationProviderProps {
  children: ReactNode;
}

export const BadgeNotificationProvider: React.FC<BadgeNotificationProviderProps> = ({ children }) => {
  const [currentBadge, setCurrentBadge] = useState<Badge | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);

  const showNextBadge = useCallback(() => {
    if (badgeQueue.length > 0) {
      const [nextBadge, ...remainingBadges] = badgeQueue;
      setCurrentBadge(nextBadge);
      setIsVisible(true);
      setBadgeQueue(remainingBadges);
    }
  }, [badgeQueue]);

  const showBadgeUnlocked = useCallback((badge: Badge) => {
    if (isVisible) {
      // Add to queue if already showing a badge
      setBadgeQueue(prev => [...prev, badge]);
    } else {
      setCurrentBadge(badge);
      setIsVisible(true);
    }
  }, [isVisible]);

  const dismissNotification = useCallback(() => {
    setIsVisible(false);
    setCurrentBadge(null);
    
    // Show next badge in queue after a short delay
    setTimeout(() => {
      if (badgeQueue.length > 0) {
        showNextBadge();
      }
    }, 300);
  }, [badgeQueue, showNextBadge]);

  return (
    <BadgeNotificationContext.Provider 
      value={{ 
        showBadgeUnlocked, 
        currentBadge, 
        isVisible, 
        dismissNotification 
      }}
    >
      {children}
    </BadgeNotificationContext.Provider>
  );
};
