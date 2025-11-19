import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFS } from '@/constants/notifications';

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Charger les préférences depuis Supabase
  const loadPreferences = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Si aucune préférence n'existe, créer les valeurs par défaut
        if (error.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('notification_preferences')
            .insert({ user_id: user.id, ...DEFAULT_NOTIFICATION_PREFS });

          if (insertError) {
            console.error('Error creating default preferences:', insertError);
          } else {
            setPreferences(DEFAULT_NOTIFICATION_PREFS);
          }
        } else {
          console.error('Error loading preferences:', error);
        }
      } else if (data) {
        setPreferences({
          reading_reminder_enabled: data.reading_reminder_enabled,
          reading_reminder_time: data.reading_reminder_time,
          daily_verse_enabled: data.daily_verse_enabled,
          daily_verse_time: data.daily_verse_time,
          badge_encouragement_enabled: data.badge_encouragement_enabled,
        });
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sauvegarder les préférences dans Supabase
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user) {
      toast.error('Vous devez être connecté pour modifier vos préférences');
      return;
    }

    try {
      setIsSaving(true);
      const updatedPrefs = { ...preferences, ...newPreferences };

      const { error } = await supabase
        .from('notification_preferences')
        .update(updatedPrefs)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating preferences:', error);
        toast.error('Erreur lors de la mise à jour des préférences');
      } else {
        setPreferences(updatedPrefs);
        toast.success('Préférences mises à jour avec succès');
      }
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      toast.error('Erreur lors de la mise à jour des préférences');
    } finally {
      setIsSaving(false);
    }
  };

  // Charger les préférences au montage
  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  return {
    preferences,
    updatePreferences,
    isLoading,
    isSaving,
    reload: loadPreferences,
  };
};
