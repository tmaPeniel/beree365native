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
  onClick?: () => void;
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badge, isUnlocked, unlockedAt, onClick }) => {
  return (
    <div 
      className={`relative p-3 rounded-lg border-2 transition-colors duration-200 min-w-[120px] flex-shrink-0 cursor-pointer ${
        isUnlocked 
          ? 'border-yellow-200 bg-yellow-50 shadow-sm' 
          : 'border-border bg-muted/50 opacity-60 hover:opacity-80'
      }`}
      onClick={onClick}
    >
      {/* Badge icon */}
      <div className={`text-3xl mb-2 text-center ${isUnlocked ? 'text-yellow-600' : 'text-muted-foreground grayscale'}`}>
        {badge.icon}
      </div>
      
      {/* Badge info */}
      <div className="text-center">
        <h3 className={`font-semibold text-xs ${isUnlocked ? 'text-yellow-800' : 'text-muted-foreground'} line-clamp-2 min-h-[2rem]`}>
          {badge.name}
        </h3>
        
        {isUnlocked && unlockedAt && (
          <div className="mt-2">
            <Badge className="text-xs px-1 py-0 bg-yellow-100 text-yellow-700 border-yellow-200">
              <Award className="h-3 w-3 mr-1" />
              Débloqué
            </Badge>
          </div>
        )}
        
        {!isUnlocked && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs text-muted-foreground px-1 py-0">
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
    <div className="relative p-3 rounded-lg border-2 border-border bg-muted/50 transition-all duration-300 min-w-[140px] flex-shrink-0 cursor-pointer hover:animate-lift active:animate-press">
      {/* Badge icon */}
      <div className="text-3xl mb-2 text-center grayscale">
        {badge.icon}
      </div>
      
      {/* Badge info */}
      <div className="text-center">
        <h3 className="font-semibold text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">
          {badge.name}
        </h3>
        
        {/* Progression */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{current}</span>
            <span>{required}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-1">
            <Badge variant="outline" className="text-xs text-primary border-primary/30 px-1 py-0">
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
  const [selectedBadge, setSelectedBadge] = useState<BadgeType | null>(null);
  const [showBadgeDetail, setShowBadgeDetail] = useState(false);

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

  const getBadgeProgressForBadge = (badgeId: string) => {
    return badgeProgress.find(bp => bp.badge.id === badgeId);
  };

  const handleBadgeClick = (badge: BadgeType) => {
    setSelectedBadge(badge);
    setShowBadgeDetail(true);
  };

  if (isLoading) {
    return (
      <Card className="bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Badges et Récompenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement des badges...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card shadow-sm animate-scale-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 animate-fade-in">
            <Trophy className="h-5 w-5 text-yellow-500 animate-wiggle" />
            Badges et Récompenses
          </CardTitle>
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">
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
        {/* Badges débloqués */}
        {userBadges.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Badges débloqués ({userBadges.length})
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {userBadges
                .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
                .map((userBadge: any) => (
                <BadgeDisplay
                  key={userBadge.id}
                  badge={userBadge.badge}
                  isUnlocked={true}
                  unlockedAt={userBadge.unlocked_at}
                  onClick={() => handleBadgeClick(userBadge.badge)}
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
                <div key={badgeItem.badge.id} onClick={() => handleBadgeClick(badgeItem.badge)}>
                  <BadgeProgressDisplay
                    badge={badgeItem.badge}
                    progress={badgeItem.progress}
                    current={badgeItem.current}
                    required={badgeItem.required}
                  />
                </div>
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
                onClick={() => handleBadgeClick(badge)}
              />
            ))}
          </div>
        </div>

        {/* Bouton pour voir tous les badges */}
        <div className="flex justify-center">
          <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
            <DialogTrigger asChild>
              <Button variant="outline" className="">
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
                  onClick={() => handleBadgeClick(badge)}
                />
              ))}
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </CardContent>
      
      {/* Animation de célébration pour nouveau badge */}
      <CelebrationEffects 
        trigger={showBadgeCelebration}
        type="badge-unlock"
        onComplete={() => setShowBadgeCelebration(false)}
      />
    </Card>

    {/* Dialog détail du badge modernisé */}
    <Dialog open={showBadgeDetail} onOpenChange={setShowBadgeDetail}>
      <DialogContent className="max-w-lg border-0 bg-gradient-to-br from-background via-background to-secondary/5 shadow-2xl animate-scale-fade-in">
        {/* Header avec icône badge en grand */}
        <div className="relative text-center pt-6 pb-4">
          {/* Badge icon avec effet glow */}
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 transition-all duration-500 ${
            isUnlocked(selectedBadge?.id || '') 
              ? 'bg-gradient-to-br from-primary/20 to-accent/20 shadow-lg shadow-primary/25 animate-float' 
              : 'bg-muted/50 grayscale'
          }`}>
            <span className="text-4xl animate-scale-fade-in">{selectedBadge?.icon}</span>
          </div>
          
          {/* Titre du badge */}
          <DialogHeader className="space-y-0">
            <DialogTitle className="text-xl font-bold text-center bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              {selectedBadge?.name}
            </DialogTitle>
          </DialogHeader>
          
          {/* Status badge avec animation */}
          <div className="flex justify-center mt-3">
            {isUnlocked(selectedBadge?.id || '') ? (
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white border-0 shadow-lg animate-success-pulse">
                <Award className="h-4 w-4 mr-2" />
                Badge débloqué
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                <Lock className="h-4 w-4 mr-2" />
                Non débloqué
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-6 px-2">
          {/* Description avec style moderne */}
          <div className="bg-gradient-to-r from-card via-card to-secondary/10 rounded-xl p-4 border border-border/50">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              Description
            </h4>
            <p className="text-muted-foreground text-sm leading-relaxed">{selectedBadge?.description}</p>
          </div>

          {/* Section conditionnelle : Date ou Progression */}
          {isUnlocked(selectedBadge?.id || '') ? (
            /* Date de déblocage avec design célébratoire */
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-800/30">
              <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                Débloqué le
              </h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {getUnlockedDate(selectedBadge?.id || '') && 
                      new Date(getUnlockedDate(selectedBadge?.id || '')!).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    }
                  </p>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">Félicitations ! 🎉</p>
                </div>
              </div>
            </div>
          ) : (
            /* Progression avec design moderne */
            selectedBadge && getBadgeProgressForBadge(selectedBadge.id) && (
              <div className="bg-gradient-to-r from-card via-card to-primary/5 rounded-xl p-4 border border-border/50">
                <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Progression vers le badge
                </h4>
                
                <div className="space-y-4">
                  {/* Stats de progression */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Actuel</span>
                    <span className="font-semibold text-foreground">
                      {getBadgeProgressForBadge(selectedBadge.id)?.current} / {getBadgeProgressForBadge(selectedBadge.id)?.required}
                    </span>
                  </div>
                  
                  {/* Barre de progression moderne */}
                  <div className="relative">
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary via-primary to-accent rounded-full transition-all duration-700 ease-out shadow-lg shadow-primary/25"
                        style={{ width: `${getBadgeProgressForBadge(selectedBadge.id)?.progress}%` }}
                      >
                        <div className="w-full h-full bg-gradient-to-r from-white/20 to-transparent rounded-full"></div>
                      </div>
                    </div>
                    {/* Indicateur de progression */}
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                        {getBadgeProgressForBadge(selectedBadge.id)?.progress}%
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Message motivationnel */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-muted-foreground">
                      {getBadgeProgressForBadge(selectedBadge.id)?.progress === 100 
                        ? "Badge prêt à être débloqué ! 🎉" 
                        : `Plus que ${getBadgeProgressForBadge(selectedBadge.id)?.required - getBadgeProgressForBadge(selectedBadge.id)?.current} pour débloquer ce badge`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
        
        {/* Footer décoratif */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-primary/30 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              ></div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default BadgesSection;