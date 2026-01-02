import React from 'react';
import { useBadgeNotification } from '@/contexts/BadgeNotificationContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import CelebrationEffects from '@/components/animations/CelebrationEffects';
import { Award, Trophy, Star, Flame, BookOpen, Target, Zap, Crown } from 'lucide-react';

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'award': Award,
  'trophy': Trophy,
  'star': Star,
  'flame': Flame,
  'book-open': BookOpen,
  'target': Target,
  'zap': Zap,
  'crown': Crown,
};

const BadgeUnlockPopup: React.FC = () => {
  const { currentBadge, isVisible, dismissNotification } = useBadgeNotification();
  const navigate = useNavigate();

  const handleViewBadges = () => {
    dismissNotification();
    navigate('/profile/badges');
  };

  const IconComponent = currentBadge?.icon 
    ? iconMap[currentBadge.icon.toLowerCase()] || Award 
    : Award;

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && dismissNotification()}>
      <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0">
        <div className="relative bg-gradient-to-br from-primary/95 to-primary rounded-2xl p-6 text-center overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {/* Badge icon container */}
            <div 
              className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-4 animate-bounce shadow-2xl"
              style={{ 
                backgroundColor: currentBadge?.color || 'hsl(var(--accent))',
                boxShadow: `0 0 40px ${currentBadge?.color || 'hsl(var(--accent))'}50`
              }}
            >
              <IconComponent className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-primary-foreground mb-2">
              🎉 Nouveau badge débloqué !
            </h2>

            {/* Badge name */}
            <h3 className="text-xl font-semibold text-primary-foreground/90 mb-2">
              {currentBadge?.name}
            </h3>

            {/* Badge description */}
            <p className="text-primary-foreground/80 mb-6 px-4">
              {currentBadge?.description}
            </p>

            {/* Action buttons */}
            <div className="flex gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={dismissNotification}
                className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-none"
              >
                Continuer
              </Button>
              <Button
                onClick={handleViewBadges}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                Voir mes badges
              </Button>
            </div>
          </div>

          {/* Celebration effects */}
          <CelebrationEffects 
            trigger={isVisible}
            type="badge-unlock"
            onComplete={() => {}}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeUnlockPopup;
