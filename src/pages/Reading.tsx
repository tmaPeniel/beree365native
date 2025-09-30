
/**
 * Page principale du plan de lecture
 * 
 * Cette page affiche :
 * - La liste complète des 365 jours du plan de lecture
 * - La progression pour chaque jour
 * - Navigation vers le jour courant
 * - Interface responsive pour mobile et desktop
 * 
 * Fonctionnalités clés :
 * - Scroll automatique vers le jour courant
 * - Cache optimisé pour les performances
 * - Gestion d'erreurs robuste
 * - Interface responsive
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import MonthlyReadingPlan from '@/components/MonthlyReadingPlan';
import DayNavigationControls from '@/components/DayNavigationControls';
import SearchBar from '@/components/SearchBar';
import { Button } from '@/components/ui/button';
import { ChevronUp } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useDateService } from '@/hooks/useDateService';
import { getOptimizedReadingPlanData } from '@/services/readingPlan/optimizedCacheService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Composant principal de la page de lecture
 * React.memo pour optimiser les performances
 */
const Reading = React.memo(() => {
  // Hooks pour l'authentification et la détection mobile
  const { profile, isLoading: authLoading } = useOptimizedAuth();
  const isMobile = useIsMobile();
  const { currentDayNumber, isLoading: dayLoading } = useDateService();
  
  // Références et état local pour la navigation
  const currentDayRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToDay, setHasScrolledToDay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollToTop, setShowScrollToTop] = useState(false);

  /**
   * Fonction pour faire défiler vers le jour courant
   * Inclut une animation et un feedback visuel
   */
  const scrollToCurrentDay = () => {
    if (currentDayRef.current) {
      // Animation de scroll fluide
      currentDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Effet visuel temporaire pour mettre en évidence le jour
      currentDayRef.current.classList.add('ring-2', 'ring-green-400', 'ring-opacity-75');
      setTimeout(() => {
        if (currentDayRef.current) {
          currentDayRef.current.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-75');
        }
      }, 2000);
      
      toast.success(`Navigation vers le jour ${currentDayNumber}`);
    } else {
      toast.error(`Impossible de trouver le jour ${currentDayNumber}`);
    }
  };

  // Requête principale pour charger toutes les données du plan de lecture
  // Cache optimisé pour de meilleures performances - avec plan sélectionné
  const { data: optimizedData = [], isLoading: dataLoading, error, refetch } = useQuery({
    queryKey: ['optimized-reading-plan-data', profile?.id, profile?.selected_plan_id, profile?.start_date],
    queryFn: async () => {
      if (!profile) return [];
      return await getOptimizedReadingPlanData(profile.id, profile.start_date);
    },
    enabled: !!profile && !authLoading, // Seulement si profil disponible
    staleTime: 3 * 60 * 1000, // Cache valide pendant 3 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire pendant 10 minutes
    retry: 2, // Réessayer 2 fois en cas d'erreur
    retryDelay: 1000 // Délai entre les tentatives
  });

  // Gestion des erreurs avec retry automatique
  useEffect(() => {
    if (error) {
      console.error('Error loading reading plan:', error);
      toast.error(`Impossible de charger le plan de lecture. Tentative de rechargement...`);
      setTimeout(() => refetch(), 2000);
    }
  }, [error, refetch]);

  // Scroll automatique vers le jour courant une seule fois
  useEffect(() => {
    if (!hasScrolledToDay && optimizedData.length > 0 && currentDayNumber && !dataLoading) {
      setTimeout(() => {
        scrollToCurrentDay();
        setHasScrolledToDay(true);
      }, 500);
    }
  }, [optimizedData.length, currentDayNumber, dataLoading, hasScrolledToDay]);

  // Réinitialiser le flag de scroll quand le jour courant change
  useEffect(() => {
    setHasScrolledToDay(false);
  }, [currentDayNumber]);

  // Filtrer les données selon la recherche
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return optimizedData;
    
    return optimizedData.filter(dayData => {
      // Rechercher dans les références des chapitres
      return dayData.chapters.some(chapter => 
        chapter.reference.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [optimizedData, searchQuery]);

  // Gestion du bouton scroll to top
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setShowScrollToTop(scrollTop > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fonction pour scroller vers le haut
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // États de chargement avec interfaces claires
  if (authLoading || dayLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement du plan de lecture...</p>
        </div>
      </div>
    );
  }

  // État de chargement des données
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Affichage du jour actuel et du verset du jour */}
        <div className="bg-card p-4 md:p-6 shadow-sm mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
          <p className="text-muted-foreground">Chargement de vos données...</p>
        </div>
        
        {/* Contenu avec indicateur de chargement */}
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement des passages...</p>
          </div>
        </div>
      </div>
    );
  }

  // État d'erreur avec option de retry
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card p-4 md:p-6 shadow-sm mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
          <p className="text-red-500">Une erreur est survenue</p>
        </div>
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Impossible de charger le plan de lecture</p>
            <button 
              onClick={() => refetch()} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rendu principal de la page
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* En-tête avec titre et contrôles de navigation */}
      <div className="bg-card p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
        {optimizedData.length > 0 ? (
          <>
            <p className="text-muted-foreground">
              Suivez votre progression au fil des jours
            </p>
            
            {/* Barre de recherche */}
            <div className="mt-4 max-w-md mx-auto">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher des passages (ex: Jean, Psaumes...)"
                className="w-full"
              />
            </div>
            
            {/* Contrôles de navigation centrés */}
            <div className="mt-4 flex justify-center">
              <DayNavigationControls 
                onCurrentDayClick={scrollToCurrentDay}
                showNavigationButtons={true}
              />
            </div>
          </>
        ) : (
          <p className="text-muted-foreground">
            Aucun passage disponible dans votre plan actuel
          </p>
        )}
      </div>
      
      {/* Contenu principal - grille des jours */}
      <div className="container mx-auto px-4 pb-16">
        {searchQuery && (
          <div className="mb-4 text-center">
            <p className="text-muted-foreground">
              {filteredData.length} résultat{filteredData.length !== 1 ? 's' : ''} trouvé{filteredData.length !== 1 ? 's' : ''} pour "{searchQuery}"
            </p>
          </div>
        )}
        
        {optimizedData.length === 0 ? (
          /* État vide avec message informatif */
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="text-6xl mb-4">📖</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Pas de passages</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Votre plan sélectionné ne contient pas de passages pour le moment.
            </p>
            <Button 
              onClick={() => window.location.href = '/reading-plan-management'}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Changer de plan
            </Button>
          </div>
        ) : filteredData.length === 0 && searchQuery ? (
          /* État de recherche sans résultats */
          <div className="text-center py-12">
            <p className="text-muted-foreground">Aucun passage trouvé pour "{searchQuery}"</p>
            <p className="text-muted-foreground text-sm mt-2">Essayez de rechercher par nom de livre (ex: Jean, Psaumes, Genèse...)</p>
          </div>
        ) : (
          /* Organisation mensuelle du plan de lecture */
          <MonthlyReadingPlan
            readingData={filteredData}
            currentDayNumber={currentDayNumber}
            currentDayRef={currentDayRef}
            isMobile={isMobile}
          />
        )}
      </div>
      
      {/* Bouton flottant pour revenir en haut */}
      {showScrollToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-50 h-12 w-12 rounded-full shadow-lg animate-fade-in hover-scale"
          size="icon"
          variant="default"
        >
          <ChevronUp className="h-5 w-5" />
        </Button>
      )}
      
    </div>
  );
});

// Nom d'affichage pour le débogage
Reading.displayName = 'Reading';
export default Reading;
