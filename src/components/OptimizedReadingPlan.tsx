
/**
 * Composant principal pour afficher et gérer le plan de lecture du jour
 * VERSION CORRIGÉE - Affichage réactif et cache optimisé
 * 
 * Corrections apportées :
 * - Configuration React Query plus réactive
 * - Cache unifié et cohérent
 * - Mises à jour optimistes améliorées
 * - Invalidation du cache corrigée
 * - Mécanismes de debugging ajoutés
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types pour une meilleure lisibilité du code
interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

interface OptimizedReadingPlanProps {
  dayNumber: number;
}

/**
 * Composant de plan de lecture optimisé et corrigé
 */
const OptimizedReadingPlan = React.memo<OptimizedReadingPlanProps>(({ dayNumber }) => {
  // Hooks d'authentification et de gestion d'état
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Configuration React Query CORRIGÉE - plus réactive
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', dayNumber],
    queryFn: () => getReadingPlanForDay(dayNumber),
    staleTime: 30 * 1000, // RÉDUIT : 30 secondes au lieu de 1 heure
    gcTime: 5 * 60 * 1000, // RÉDUIT : 5 minutes au lieu de 2 heures
    refetchOnMount: true, // ACTIVÉ : recharge à chaque montage
    refetchOnWindowFocus: true, // ACTIVÉ : recharge au focus
    enabled: !!dayNumber
  });

  // Requête pour la progression utilisateur CORRIGÉE
  const { data: progressData = [], isLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['user-progress-optimized', user?.id, dayNumber],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, dayNumber) : [],
    staleTime: 15 * 1000, // RÉDUIT : 15 secondes
    gcTime: 2 * 60 * 1000, // RÉDUIT : 2 minutes
    refetchOnMount: true, // ACTIVÉ pour fraîcheur des données
    refetchOnWindowFocus: true, // ACTIVÉ pour réactivité
    enabled: !!user && !!dayNumber,
    // AJOUT : revalidation automatique périodique
    refetchInterval: 30 * 1000 // Revalide toutes les 30 secondes
  });

  // Debug : Logs pour tracer les mises à jour
  useEffect(() => {
    if (debugMode) {
      console.log(`🔍 [DEBUG] OptimizedReadingPlan - Day ${dayNumber}:`, {
        chaptersCount: chaptersData.length,
        progressCount: progressData.length,
        isLoading,
        lastUpdateTime,
        user: user?.id
      });
    }
  }, [debugMode, dayNumber, chaptersData.length, progressData.length, isLoading, lastUpdateTime, user?.id]);

  // Calcul optimisé des éléments de lecture avec debugging
  const readingItems = useMemo(() => {
    if (!chaptersData.length) return [];
    
    const items = chaptersData.map(chapter => {
      const progressItem = progressData.find(p => p.chapter_id === chapter.id);
      const completed = progressItem ? progressItem.status === 'completed' : false;
      
      if (debugMode) {
        console.log(`📖 [DEBUG] Chapter ${chapter.reference}:`, { 
          id: chapter.id, 
          completed, 
          progressItem: !!progressItem 
        });
      }
      
      return {
        id: chapter.id,
        reference: chapter.reference,
        completed
      };
    });
    
    if (debugMode) {
      console.log(`📊 [DEBUG] Total items: ${items.length}, Completed: ${items.filter(i => i.completed).length}`);
    }
    
    return items;
  }, [chaptersData, progressData, debugMode]);

  // Gestionnaire CORRIGÉ pour marquer/démarquer un passage
  const handleToggleRead = useCallback(async (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!user) {
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
      return;
    }
    
    const item = readingItems.find(item => item.id === id);
    if (!item) return;
    
    try {
      setProcessingIds(prev => [...prev, id]);
      
      if (debugMode) {
        console.log(`🔄 [DEBUG] Toggling chapter ${item.reference}: ${item.completed} -> ${!item.completed}`);
      }
      
      const result = await optimizedToggleChapterStatus(
        user.id, 
        id, 
        item.completed ? 'completed' : 'pending',
        dayNumber
      );
      
      if (result.success) {
        // Mise à jour optimiste AMÉLIORÉE avec vérification
        queryClient.setQueryData(['user-progress-optimized', user.id, dayNumber], (oldData: any[]) => {
          if (!oldData) return oldData;
          
          const existingIndex = oldData.findIndex(item => item.chapter_id === id);
          const newStatus = item.completed ? 'pending' : 'completed';
          
          if (existingIndex >= 0) {
            const updatedData = [...oldData];
            updatedData[existingIndex] = {
              ...updatedData[existingIndex],
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            };
            return updatedData;
          } else {
            return [...oldData, {
              id: `temp-${id}`,
              user_id: user.id,
              chapter_id: id,
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
              reading_plan_chapters: chaptersData.find(c => c.id === id)
            }];
          }
        });
        
        // Invalidation CORRIGÉE avec refetch actif
        queryClient.invalidateQueries({ 
          queryKey: ['optimized-reading-plan-data', user.id],
          refetchType: 'active' // CORRIGÉ : 'active' au lieu de 'none'
        });
        
        // Déclencher la mise à jour globale
        triggerProgressUpdate();
        setLastUpdateTime(new Date());
        
        if (debugMode) {
          console.log(`✅ [DEBUG] Successfully toggled chapter ${item.reference}`);
        }
        
        // AJOUT : Vérification post-update
        setTimeout(() => {
          refetchProgress();
        }, 500);
        
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error(`❌ [ERROR] Toggling chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // AJOUT : Rollback en cas d'erreur
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress-optimized', user.id, dayNumber],
        refetchType: 'active'
      });
      
      // Force la revalidation en cas d'échec
      setTimeout(() => {
        refetchProgress();
      }, 1000);
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, dayNumber, queryClient, triggerProgressUpdate, chaptersData, debugMode, refetchProgress]);

  // AJOUT : Fonction de rafraîchissement manuel
  const handleManualRefresh = useCallback(async () => {
    if (!user) return;
    
    toast.info("Rafraîchissement des données...");
    
    try {
      // Invalider tous les caches liés
      await queryClient.invalidateQueries({ 
        queryKey: ['user-progress-optimized', user.id, dayNumber],
        refetchType: 'active'
      });
      
      await queryClient.invalidateQueries({ 
        queryKey: ['reading-plan-chapters', dayNumber],
        refetchType: 'active'
      });
      
      // Force le rechargement
      await refetchProgress();
      
      setLastUpdateTime(new Date());
      toast.success("Données rafraîchies avec succès");
      
      if (debugMode) {
        console.log(`🔄 [DEBUG] Manual refresh completed for day ${dayNumber}`);
      }
    } catch (error) {
      console.error("❌ [ERROR] Manual refresh failed:", error);
      toast.error("Erreur lors du rafraîchissement");
    }
  }, [user, dayNumber, queryClient, refetchProgress, debugMode]);

  // Composant de ligne optimisé avec indicateurs de synchronisation
  const ReadingItemRow = React.memo<{
    item: ReadingItem;
    isProcessing: boolean;
    onToggle: (event: React.MouseEvent) => void;
  }>(({ item, isProcessing, onToggle }) => (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onToggle}
        disabled={isProcessing}
        className={`flex items-center w-full text-left transition-all ${
          item.completed ? 'text-gray-400' : 'text-gray-800'
        } ${isProcessing ? 'opacity-70' : 'hover:bg-gray-50 rounded p-1'}`}
      >
        <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
          item.completed ? 'bg-green-500' : 'border-2 border-green-300 hover:border-green-400'
        }`}>
          {isProcessing ? (
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          ) : (
            item.completed && <Check className="h-3 w-3 text-white" />
          )}
        </div>
        <span className={item.completed ? 'line-through' : ''}>
          {item.reference}
        </span>
      </button>
    </li>
  ));

  ReadingItemRow.displayName = 'ReadingItemRow';

  // État de chargement
  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rendu principal du composant
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        {/* En-tête avec contrôles améliorés */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
              Jour {dayNumber}/365
            </span>
            {/* AJOUT : Debug toggle et bouton refresh */}
            <button
              onClick={() => setDebugMode(!debugMode)}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Toggle debug mode"
            >
              {debugMode ? '🐛' : '🔧'}
            </button>
            <button
              onClick={handleManualRefresh}
              className="text-sm text-gray-500 hover:text-gray-700 p-1 rounded"
              title="Rafraîchir manuellement"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* AJOUT : Indicateurs de synchronisation */}
        {debugMode && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>Chapitres: {chaptersData.length}</div>
              <div>Progression: {progressData.length}</div>
              <div>Complétés: {readingItems.filter(i => i.completed).length}</div>
              <div>Dernière MAJ: {lastUpdateTime?.toLocaleTimeString() || 'N/A'}</div>
            </div>
          </div>
        )}
        
        {/* Section des passages à lire */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Passages du jour</h3>
          {readingItems.length > 0 ? (
            <ul className="space-y-2">
              {readingItems.map((item) => (
                <ReadingItemRow
                  key={item.id}
                  item={item}
                  isProcessing={processingIds.includes(item.id)}
                  onToggle={(event) => handleToggleRead(event, item.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 my-4">
              Aucun passage trouvé pour ce jour
            </p>
          )}
        </div>
        
        {/* AJOUT : Statistiques en temps réel */}
        <div className="text-center text-sm text-gray-500">
          {readingItems.length > 0 && (
            <span>
              {readingItems.filter(i => i.completed).length} / {readingItems.length} passages complétés
              {lastUpdateTime && (
                <span className="ml-2 text-xs">
                  (MAJ: {lastUpdateTime.toLocaleTimeString()})
                </span>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedReadingPlan.displayName = 'OptimizedReadingPlan';

export default OptimizedReadingPlan;
