
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { getReadingPlanForDay, getUserProgressForDay, toggleChapterStatus } from '@/services/readingPlanService';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

interface DayReadingDialogProps {
  day: number;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

const DayReadingDialog: React.FC<DayReadingDialogProps> = ({ day, date, isOpen, onClose }) => {
  const { user, triggerProgressUpdate } = useAuth();
  const [readingItems, setReadingItems] = useState<ReadingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const formattedDate = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  
  useEffect(() => {
    if (!user || !isOpen) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        console.log(`Fetching reading plan data for day ${day}...`);
        // Obtenir le plan de lecture pour ce jour
        const chaptersData = await getReadingPlanForDay(day);
        
        if (!chaptersData || chaptersData.length === 0) {
          console.log(`No chapters found for day ${day}`);
          setReadingItems([]);
          setIsLoading(false);
          return;
        }
        
        console.log(`Fetching progress data for user ${user.id} and day ${day}...`);
        // Obtenir la progression de l'utilisateur
        const progressData = await getUserProgressForDay(user.id, day);
        
        // Créer les éléments de lecture
        const items: ReadingItem[] = chaptersData.map(chapter => {
          const progressItem = progressData.find(p => p.chapter_id === chapter.id);
          return {
            id: chapter.id,
            reference: chapter.reference,
            completed: progressItem ? progressItem.status === 'completed' : false
          };
        });
        
        console.log(`Loaded ${items.length} reading items for day ${day}`);
        setReadingItems(items);
      } catch (error) {
        console.error(`Error loading reading plan for day ${day}:`, error);
        toast.error("Impossible de charger le plan de lecture");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [day, user, isOpen]);
  
  /**
   * Gestion du changement de statut d'un élément de lecture
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="mb-1 text-lg font-bold">Jour {day}</div>
            <div className="text-sm text-gray-500">{formattedDate}</div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <h3 className="text-md font-medium text-center mb-4">Passages à lire</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
              {readingItems.length > 0 ? (
                readingItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => !processingIds.includes(item.id) && handleToggleRead(item.id)}
                    disabled={processingIds.includes(item.id)}
                    className={`flex items-center w-full p-3 text-left rounded-md hover:bg-gray-100 transition-colors ${
                      item.completed ? 'text-gray-400 bg-gray-50' : 'text-gray-800'
                    } ${processingIds.includes(item.id) ? 'opacity-70' : ''}`}
                  >
                    <div className={`h-6 w-6 rounded mr-3 flex items-center justify-center transition-colors ${
                      item.completed ? 'bg-green-500' : 'border-2 border-green-300'
                    }`}>
                      {processingIds.includes(item.id) ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        item.completed && <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className={item.completed ? 'line-through' : ''}>
                      {item.reference}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 my-4">
                  Aucun passage trouvé pour ce jour
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayReadingDialog;
