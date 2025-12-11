import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseVerseLikesReturn {
  likesCount: number;
  hasLiked: boolean;
  isLoading: boolean;
  toggleLike: () => Promise<void>;
}

export function useVerseLikes(dayNumber: number): UseVerseLikesReturn {
  const { user } = useAuth();
  const [likesCount, setLikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch likes count and user like status
  const fetchLikesData = useCallback(async () => {
    if (!dayNumber) return;

    try {
      // Get total likes count
      const { count } = await supabase
        .from('verse_likes')
        .select('*', { count: 'exact', head: true })
        .eq('verse_day_number', dayNumber);

      setLikesCount(count || 0);

      // Check if current user has liked
      if (user) {
        const { data } = await supabase
          .from('verse_likes')
          .select('id')
          .eq('verse_day_number', dayNumber)
          .eq('user_id', user.id)
          .maybeSingle();

        setHasLiked(!!data);
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
    if (!user || !dayNumber) return;

    // Optimistic update
    const wasLiked = hasLiked;
    setHasLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    try {
      if (wasLiked) {
        // Remove like
        await supabase
          .from('verse_likes')
          .delete()
          .eq('verse_day_number', dayNumber)
          .eq('user_id', user.id);
      } else {
        // Add like
        await supabase
          .from('verse_likes')
          .insert({
            verse_day_number: dayNumber,
            user_id: user.id,
          });
      }
    } catch (error) {
      // Revert on error
      console.error('Error toggling like:', error);
      setHasLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
    }
  }, [user, dayNumber, hasLiked]);

  return {
    likesCount,
    hasLiked,
    isLoading,
    toggleLike,
  };
}
