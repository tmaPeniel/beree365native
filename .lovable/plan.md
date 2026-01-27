

## Plan : Ajouter la modification de la date de début sur /reading-plan

### Objectif
Permettre à l'utilisateur de modifier la date de début de son plan de lecture directement depuis la page `/reading-plan`, avec un sélecteur de date visuel.

---

## Aperçu de la solution

Une nouvelle section sera ajoutée entre "Mon plan actuel" et "Changer de plan", affichant :
- La date de début actuelle
- Un bouton pour ouvrir un calendrier (DatePicker)
- Une confirmation avant modification avec avertissement sur l'impact

---

## Modifications

### Fichier : `src/pages/ReadingPlanManagement.tsx`

#### 1. Nouveaux imports

```tsx
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { updateUserProfile } from '@/services/authService';
import { invalidateUserCacheSelective } from '@/services/readingPlan/optimizedCacheService';
```

#### 2. Nouvelle query pour récupérer le profil

```tsx
const { data: userProfile } = useQuery({
  queryKey: ['user-profile', user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('start_date')
      .eq('id', user?.id)
      .single();
    return data;
  },
  enabled: !!user,
});
```

#### 3. États pour le DatePicker

```tsx
const [selectedDate, setSelectedDate] = useState<Date | undefined>();
const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
const [isUpdatingDate, setIsUpdatingDate] = useState(false);
```

#### 4. Fonction de mise à jour de la date

```tsx
const handleUpdateStartDate = async () => {
  if (!user || !selectedDate) return;
  
  setIsUpdatingDate(true);
  try {
    const formattedDate = format(selectedDate, 'yyyy-MM-dd');
    const result = await updateUserProfile(user.id, { start_date: formattedDate });
    
    if (result.success) {
      invalidateUserCacheSelective(user.id);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['optimized-reading-plan-data'] });
      toast.success('Date de début mise à jour !');
      setIsDatePickerOpen(false);
    }
  } catch (error) {
    toast.error('Erreur lors de la mise à jour');
  } finally {
    setIsUpdatingDate(false);
  }
};
```

#### 5. Nouvelle section UI (après "Mon plan actuel")

```tsx
{/* Section: Date de début */}
{currentPlan && userProfile && (
  <section className="space-y-3">
    <h2 className="text-base font-semibold text-foreground">Date de début</h2>
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">
                Votre plan a commencé le :
              </p>
              <p className="font-semibold text-foreground">
                {format(new Date(userProfile.start_date), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>
            
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-3 w-3 mr-1" />
                  Modifier la date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={fr}
                  className="pointer-events-auto"
                />
                <div className="p-3 border-t space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Modifier la date recalculera votre jour actuel.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setIsDatePickerOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button 
                      size="sm"
                      onClick={handleUpdateStartDate}
                      disabled={!selectedDate || isUpdatingDate}
                    >
                      {isUpdatingDate ? 'Mise à jour...' : 'Confirmer'}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  </section>
)}
```

---

## Résumé technique

| Élément | Description |
|---------|-------------|
| Composant DatePicker | Utilise `Calendar` + `Popover` de shadcn/ui |
| Format date | `date-fns` avec locale française |
| Service utilisé | `updateUserProfile` existant |
| Invalidation cache | `invalidateUserCacheSelective` + queries React Query |
| Confirmation | Boutons Annuler/Confirmer dans le popover |

### Points clés
- `pointer-events-auto` sur le Calendar pour garantir l'interactivité
- Locale française pour l'affichage des dates
- Avertissement clair sur l'impact du changement de date
- Design cohérent avec les autres sections de la page

---

## Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/pages/ReadingPlanManagement.tsx` | Ajouter la section Date de début avec DatePicker |

