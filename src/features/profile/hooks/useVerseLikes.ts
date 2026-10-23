import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface UseVerseLikesReturn {
  likesCount: number;
  hasLiked: boolean;
  isLoading: boolean;
  toggleLike: () => Promise<{ success: boolean; error?: string }>;
}

export function useVerseLikes(dayNumber: number): UseVerseLikesReturn {
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);

  // Fetch likes count and user like status
  const fetchLikesData = useCallback(async () => {
    if (!dayNumber) {
      setLikesCount(0);
      setHasLiked(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Get likes count directly from daily_verses (optimized)
      const { data: verseData, error: verseError } = await supabase
        .from('daily_verses')
        .select('likes_count')
        .eq('day_number', dayNumber)
        .maybeSingle();

      if (verseError) throw verseError;
      setLikesCount(verseData?.likes_count || 0);

      // Check if current user has liked
      if (user) {
        const { data, error: likeError } = await supabase
          .from('verse_likes')
          .select('id')
          .eq('verse_day_number', dayNumber)
          .eq('user_id', user.id)
          .maybeSingle();

        if (likeError) throw likeError;
        setHasLiked(!!data);
      } else {
        setHasLiked(false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dayNumber, user]);

  useEffect(() => {
    fetchLikesData();
  }, [fetchLikesData]);

  const toggleLike = useCallback(async () => {
    if (!user || !dayNumber) {
      return { success: false, error: "Connectez-vous pour aimer ce verset." };
    }

    if (isUpdatingRef.current) {
      return { success: false, error: "La modification est déjà en cours." };
    }

    isUpdatingRef.current = true;
    setIsUpdating(true);

    // Optimistic update
    const wasLiked = hasLiked;
    const previousLikesCount = likesCount;
    setHasLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      if (wasLiked) {
        // Remove like
        const { error } = await supabase
          .from('verse_likes')
          .delete()
          .eq('verse_day_number', dayNumber)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('verse_likes')
          .insert({
            verse_day_number: dayNumber,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await fetchLikesData();
      return { success: true };
    } catch (error) {
      // Revert on error
      console.error('Error toggling like:', error);
      setHasLiked(wasLiked);
      setLikesCount(previousLikesCount);
      return { success: false, error: "Impossible de modifier ce J'aime pour le moment." };
    } finally {
      isUpdatingRef.current = false;
      setIsUpdating(false);
    }
  }, [user, dayNumber, hasLiked, likesCount, fetchLikesData]);

  return {
    likesCount,
    hasLiked,
    isLoading: isLoading || isUpdating,
    toggleLike,
  };
}
