import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Award, Star, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getAllBadges, getUserBadges, calculateUserBadges, getBadgeStats, getBadgeProgress } from '@/services/badgeService';
import type { Badge as BadgeType, UserBadge } from '@/services/badgeService';
import { toast } from 'sonner';
import CelebrationEffects from '@/components/animations/CelebrationEffects';

interface BadgeDisplayProps {
  badge: BadgeType;
  isUnlocked: boolean;
  unlockedAt?: string;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badge, isUnlocked, unlockedAt }) => {
  return (
    <div className={`relative p-3 rounded-lg border-2 transition-all duration-300 min-w-[120px] flex-shrink-0 hover:scale-105 ${
      isUnlocked 
        ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-orange-50 shadow-lg animate-badge-unlock' 
        : 'border-gray-200 bg-gray-50 opacity-60 hover:opacity-80'
    }`}>
      {/* Badge icon */}
      <div className={`text-3xl mb-2 text-center transition-all duration-300 ${
        isUnlocked ? 'animate-heart-beat' : 'grayscale hover:grayscale-0'
      }`}>
        {badge.icon}
      </div>
      
      {/* Badge info */}
      <div className="text-center">
        <h3 className={`font-semibold text-xs ${isUnlocked ? 'text-gray-800' : 'text-gray-500'} line-clamp-2 min-h-[2rem]`}>
          {badge.name}
        </h3>
        
        {isUnlocked && unlockedAt && (
          <div className="mt-2">
            <Badge variant="secondary" className="text-xs px-1 py-0">
              <Award className="h-3 w-3 mr-1" />
              Débloqué
            </Badge>
          </div>
        )}
        
        {!isUnlocked && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-gray-500 px-1 py-0">
              <Lock className="h-3 w-3 mr-1" />
              Verrouillé
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

interface BadgeProgressDisplayProps {
  badge: BadgeType;
  progress: number;
  current: number;
  required: number;
}

const BadgeProgressDisplay: React.FC<BadgeProgressDisplayProps> = ({ badge, progress, current, required }) => {
  return (
    <div className="relative p-3 rounded-lg border-2 border-gray-200 bg-gray-50 transition-all duration-300 min-w-[140px] flex-shrink-0">
      {/* Badge icon */}
      <div className="text-3xl mb-2 text-center grayscale">
        {badge.icon}
      </div>
      
      {/* Badge info */}
      <div className="text-center">
        <h3 className="font-semibold text-xs text-gray-500 line-clamp-2 min-h-[2rem]">
          {badge.name}
        </h3>
        
        {/* Progression */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>{current}</span>
            <span>{required}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-1">
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 px-1 py-0">
              {progress}%
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
};

const BadgesSection: React.FC = () => {
  const { user } = useOptimizedAuth();
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [previousBadgeCount, setPreviousBadgeCount] = useState(0);
  const [showBadgeCelebration, setShowBadgeCelebration] = useState(false);
  const [badgeProgress, setBadgeProgress] = useState<{
    badge: BadgeType;
    progress: number;
    current: number;
    required: number;
  }[]>([]);
  const [badgeStats, setBadgeStats] = useState({
    totalBadges: 0,
    unlockedBadges: 0,
    progressPercentage: 0,
    latestBadges: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAllBadges, setShowAllBadges] = useState(false);

  const loadBadgesData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Calculer les badges automatiquement
      await calculateUserBadges(user.id);
      
      // Charger toutes les données
      const [badges, userBadgesData, stats, progress] = await Promise.all([
        getAllBadges(),
        getUserBadges(user.id),
        getBadgeStats(user.id),
        getBadgeProgress(user.id)
      ]);

      setAllBadges(badges);
      
      // Détecter les nouveaux badges
      if (previousBadgeCount > 0 && userBadgesData.length > previousBadgeCount) {
        setShowBadgeCelebration(true);
        toast.success('🏆 Nouveau badge débloqué !', {
          duration: 3000,
        });
      }
      
      setUserBadges(userBadgesData);
      setPreviousBadgeCount(userBadgesData.length);
      setBadgeStats(stats);
      setBadgeProgress(progress);
    } catch (error) {
      console.error('Erreur lors du chargement des badges:', error);
      toast.error('Impossible de charger les badges');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBadgesData();
  }, [user?.id]);

  const isUnlocked = (badgeId: string) => {
    return userBadges.some(ub => ub.badge_id === badgeId);
  };

  const getUnlockedDate = (badgeId: string) => {
    const userBadge = userBadges.find(ub => ub.badge_id === badgeId);
    return userBadge?.unlocked_at;
  };

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Badges et Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Chargement des badges...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white shadow-sm animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 animate-fade-in">
            <Trophy className="h-5 w-5 text-yellow-500 animate-wiggle" />
            Badges et Récompenses
          </CardTitle>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-gray-600">
            {badgeStats.unlockedBadges} / {badgeStats.totalBadges} badges débloqués
          </div>
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            {badgeStats.progressPercentage}%
          </Badge>
        </div>
        
        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${badgeStats.progressPercentage}%` }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Derniers badges débloqués */}
        {badgeStats.latestBadges.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Derniers badges débloqués
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {badgeStats.latestBadges.map((userBadge: any) => (
                <BadgeDisplay
                  key={userBadge.id}
                  badge={userBadge.badge}
                  isUnlocked={true}
                  unlockedAt={userBadge.unlocked_at}
                />
              ))}
            </div>
          </div>
        )}

        {/* Badges à débloquer */}
        {badgeProgress.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-500" />
              Badges à débloquer
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {badgeProgress.map((badgeItem) => (
                <BadgeProgressDisplay
                  key={badgeItem.badge.id}
                  badge={badgeItem.badge}
                  progress={badgeItem.progress}
                  current={badgeItem.current}
                  required={badgeItem.required}
                />
              ))}
            </div>
          </div>
        )}

        {/* Aperçu des badges */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-800 mb-3">Tous les badges</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {allBadges.slice(0, 4).map((badge) => (
              <BadgeDisplay
                key={badge.id}
                badge={badge}
                isUnlocked={isUnlocked(badge.id)}
                unlockedAt={getUnlockedDate(badge.id)}
              />
            ))}
          </div>
        </div>

        {/* Bouton pour voir tous les badges */}
        <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              Voir tous les badges ({allBadges.length})
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Collection de badges
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
              {allBadges.map((badge) => (
                <BadgeDisplay
                  key={badge.id}
                  badge={badge}
                  isUnlocked={isUnlocked(badge.id)}
                  unlockedAt={getUnlockedDate(badge.id)}
                />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
      
      {/* Animation de célébration pour nouveau badge */}
      <CelebrationEffects 
        trigger={showBadgeCelebration}
        type="badge-unlock"
        onComplete={() => setShowBadgeCelebration(false)}
      />
    </Card>
    </>
  );
};

export default BadgesSection;