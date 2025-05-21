
/**
 * Composant pour afficher le plan de lecture quotidien
 * Affiche les passages à lire pour un jour spécifique
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getReadingPlanForDay, toggleChapterStatus, getUserProgressForDay } from '@/services/readingPlanService';
import { ReadingPlanChapter } from '@/types/supabase';

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
  const { user } = useAuth();
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Récupération des données du plan de lecture
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Obtenir le plan de lecture pour ce jour
        const chaptersData = await getReadingPlanForDay(dayNumber);
        
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
        
        setReadingItems(items);
      } catch (error) {
        console.error("Erreur lors du chargement du plan de lecture:", error);
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
    if (!user) return;
    
    // Trouver l'élément dans la liste
    const item = readingItems.find(item => item.id === id);
    if (!item) return;
    
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
                    onClick={() => handleToggleRead(item.id)}
                    className={`flex items-center w-full text-left ${
                      item.completed ? 'text-gray-400' : 'text-gray-800'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
                      item.completed ? 'bg-green-500' : 'border-2 border-green-300'
                    }`}>
                      {item.completed && <Check className="h-3 w-3 text-white" />}
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
