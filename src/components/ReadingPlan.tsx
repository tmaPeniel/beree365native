/**
 * Composant pour afficher le plan de lecture quotidien
 * Affiche les passages à lire pour un jour spécifique
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getReadingPlanForDay, toggleChapterStatus, getUserProgressForDay } from '@/services/readingPlan';
import { toast } from 'sonner';

// Type pour les éléments de lecture
interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

// Type pour les propriétés du composant
interface ReadingPlanProps {
  dayNumber: number;
  onToggleRead?: (id: string) => void;
}

/**
 * Composant du plan de lecture quotidien
 */
const ReadingPlan: React.FC<ReadingPlanProps> = ({ dayNumber }) => {
  const { user, triggerProgressUpdate } = useAuth();
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<string[]>([]);

  // Récupération des données du plan de lecture
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        console.error("No user found when loading reading plan");
        return;
      }
      
      setIsLoading(true);
      
      try {
        console.log(`Fetching reading plan for day ${dayNumber}...`);
        // Obtenir le plan de lecture pour ce jour
        const chaptersData = await getReadingPlanForDay(dayNumber);
        
        if (!chaptersData || chaptersData.length === 0) {
          console.log(`No chapters found for day ${dayNumber}`);
          setReadingItems([]);
          setIsLoading(false);
          return;
        }
        
        console.log(`Fetching user progress for day ${dayNumber}...`);
        // Obtenir la progression de l'utilisateur
        const progressData = await getUserProgressForDay(user.id, dayNumber);
        
        // Créer les éléments de lecture
        const items: ReadingItem[] = chaptersData.map(chapter => {
          const progressItem = progressData.find(p => p.chapter_id === chapter.id);
          return {
            id: chapter.id,
            reference: chapter.reference,
            completed: progressItem ? progressItem.status === 'completed' : false
          };
        });
        
        console.log(`Loaded ${items.length} reading items for day ${dayNumber}`);
        setReadingItems(items);
      } catch (error) {
        console.error(`Error loading reading plan for day ${dayNumber}:`, error);
        toast.error("Impossible de charger le plan de lecture");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [dayNumber, user]);

  /**
   * Gestion du changement de statut d'un élément de lecture
   * @param {string} id ID du chapitre
   */
  const handleToggleRead = async (id: string) => {
    if (!user) {
      console.error("No user found when trying to toggle read status");
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
      return;
    }
    
    // Trouver l'élément dans la liste
    const item = readingItems.find(item => item.id === id);
    if (!item) {
      console.error(`Reading item with id ${id} not found`);
      return;
    }
    
    // Définir le nouveau statut
    const newStatus = item.completed ? 'pending' : 'completed';
    
    try {
      // Marquer comme en cours de traitement
      setProcessingIds(prev => [...prev, id]);
      
      console.log(`Toggling status for chapter ${id} from ${item.completed ? 'completed' : 'pending'} to ${newStatus}`);
      
      // Mettre à jour le statut dans Supabase
      const result = await toggleChapterStatus(user.id, id, item.completed ? 'completed' : 'pending');
      
      if (result.success) {
        // Mettre à jour l'état local
        setReadingItems(prev => prev.map(item => {
          if (item.id === id) {
            return { ...item, completed: !item.completed };
          }
          return item;
        }));
        
        // Signaler la mise à jour aux autres composants
        triggerProgressUpdate();
        console.log(`Successfully toggled status for chapter ${id} to ${newStatus}`);
      } else {
        console.error(`Failed to toggle status for chapter ${id}:`, result.error);
        toast.error(`Échec de la mise à jour: ${result.error}`);
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
    } finally {
      // Retirer de la liste des éléments en cours de traitement
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  // Afficher un indicateur de chargement
  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
            Jour {dayNumber}/365
          </span>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Passages du jour</h3>
          {readingItems.length > 0 ? (
            <ul className="space-y-3">
              {readingItems.map((item) => (
                <li key={item.id} className="flex items-center">
                  <button
                    onClick={() => !processingIds.includes(item.id) && handleToggleRead(item.id)}
                    disabled={processingIds.includes(item.id)}
                    className={`flex items-center w-full text-left ${
                      item.completed ? 'text-gray-400' : 'text-gray-800'
                    } ${processingIds.includes(item.id) ? 'opacity-70' : ''}`}
                  >
                    <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
                      item.completed ? 'bg-green-500' : 'border-2 border-green-300'
                    }`}>
                      {processingIds.includes(item.id) ? (
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
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 my-4">
              Aucun passage trouvé pour ce jour
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingPlan;
