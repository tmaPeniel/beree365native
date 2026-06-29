
import { supabase } from '@/integrations/supabase/client';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: any; // JSONB peut être n'importe quel type JSON
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  created_at: string;
  badge: Badge;
}

/**
 * Récupérer tous les badges disponibles
 */
export const getAllBadges = async (): Promise<Badge[]> => {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur getAllBadges:', error);
    return [];
  }
};

/**
 * Récupérer les badges débloqués par un utilisateur
 */
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des badges utilisateur:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur getUserBadges:', error);
    return [];
  }
};

/**
 * Calculer et débloquer automatiquement les badges pour un utilisateur
 */
export const calculateUserBadges = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('calculate_user_badges', {
      _user_id: userId
    });

    if (error) {
      console.error('Erreur lors du calcul des badges:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erreur calculateUserBadges:', error);
    return false;
  }
};

/**
 * Débloquer manuellement un badge pour un utilisateur
 */
export const unlockBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId
      });

    if (error) {
      console.error('Erreur lors du déverrouillage du badge:', error);
      throw error;
    }

    console.log('Nouveau badge débloqué');
    return true;
  } catch (error) {
    console.error('Erreur unlockBadge:', error);
    return false;
  }
};

/**
 * Calculer le pourcentage de progression pour chaque badge non débloqué
 * Ajout du support pour: streak_days, fixed_time_streak, time_of_day, resume_after_gap, encouragements_used, book_completed
 */
export const getBadgeProgress = async (userId: string): Promise<{
  badge: Badge;
  progress: number;
  current: number;
  required: number;
}[]> => {
  try {
    // 1) Récupérer le plan de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('selected_plan_id')
      .eq('id', userId)
      .maybeSingle();

    const userPlanId = profile?.selected_plan_id;

    if (!userPlanId) {
      console.warn('User has no selected plan');
      return [];
    }

    // 2) Récupérer badges et ceux déjà débloqués
    const [allBadges, userBadges] = await Promise.all([
      getAllBadges(),
      getUserBadges(userId),
    ]);
    const unlockedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
    const lockedBadges = allBadges.filter(badge => !unlockedBadgeIds.has(badge.id));

    if (lockedBadges.length === 0) return [];

    // 2) Récupérer progressions complétées (pour chapitres, jours, heures)
    const { data: completedProgressData } = await supabase
      .from('user_progress')
      .select('chapter_id, completed_at')
      .eq('user_id', userId)
      .eq('status', 'completed');

    const completedProgress = (completedProgressData || []).filter(p => !!p.completed_at);

    // A) Statistiques de base
    const completedChapters = completedProgress.length;

    // B) Jours complétés (via RPC)
    const { data: completedDaysData } = await supabase
      .rpc('get_completed_days_count', { p_user_id: userId });
    const completedDays = completedDaysData || 0;

    // C) Calculs dérivés sur les lectures par jour
    type DayInfo = { dateKey: string; firstTime: Date; firstHour: number };
    const dayMap = new Map<string, Date>(); // day => earliest Date
    for (const p of completedProgress) {
      const d = new Date(p.completed_at as string);
      const dateKey = d.toISOString().slice(0, 10);
      const prev = dayMap.get(dateKey);
      if (!prev || d < prev) {
        dayMap.set(dateKey, d);
      }
    }

    const days: DayInfo[] = Array.from(dayMap.entries())
      .map(([dateKey, firstTime]) => ({ dateKey, firstTime, firstHour: firstTime.getUTCHours() }))
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

    // Helpers
    const toDate = (key: string) => new Date(key + 'T00:00:00.000Z');
    const diffDays = (a: string, b: string) =>
      Math.round((toDate(a).getTime() - toDate(b).getTime()) / (1000 * 60 * 60 * 24));

    // Max streak of consecutive days
    let maxStreak = 0;
    let run = 0;
    let prevDayKey: string | null = null;
    for (const di of days) {
      if (prevDayKey && diffDays(di.dateKey, prevDayKey) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      maxStreak = Math.max(maxStreak, run);
      prevDayKey = di.dateKey;
    }

    // Morning/Evening days based on earliest read time per day
    const morningDays = days.filter(d => d.firstHour < 7).length;     // < 07:00
    const eveningDays = days.filter(d => d.firstHour >= 21).length;   // >= 21:00

    // Max same-hour streak across consecutive days (based on earliest hour each day)
    let maxSameHourStreak = 0;
    let sameHourRun = 0;
    let prev: DayInfo | null = null;
    for (const di of days) {
      if (
        prev &&
        di.firstHour === prev.firstHour &&
        diffDays(di.dateKey, prev.dateKey) === 1
      ) {
        sameHourRun += 1;
      } else {
        sameHourRun = 1;
      }
      maxSameHourStreak = Math.max(maxSameHourStreak, sameHourRun);
      prev = di;
    }
    // Current consecutive-day streak (resets to 0 if a day is missed)
    let currentStreak = 0;
    if (days.length > 0) {
      currentStreak = 1;
      for (let i = days.length - 1; i > 0; i--) {
        if (diffDays(days[i].dateKey, days[i - 1].dateKey) === 1) {
          currentStreak += 1;
        } else {
          break;
        }
      }
      const todayKey = new Date().toISOString().slice(0, 10);
      const gapToToday = diffDays(todayKey, days[days.length - 1].dateKey);
      if (gapToToday > 1) {
        currentStreak = 0;
      }
    }

    // Current fixed-time streak (same hour across consecutive days, resets if day missed)
    let currentSameHourStreak = 0;
    if (days.length > 0) {
      currentSameHourStreak = 1;
      for (let i = days.length - 1; i > 0; i--) {
        const a = days[i];
        const b = days[i - 1];
        if (a.firstHour === b.firstHour && diffDays(a.dateKey, b.dateKey) === 1) {
          currentSameHourStreak += 1;
        } else {
          break;
        }
      }
      const todayKey = new Date().toISOString().slice(0, 10);
      const gapToToday = diffDays(todayKey, days[days.length - 1].dateKey);
      if (gapToToday > 1) {
        currentSameHourStreak = 0;
      }
    }

    // Array of gaps in days between consecutive reading days
    const gaps: number[] = [];
    for (let i = 1; i < days.length; i++) {
      gaps.push(diffDays(days[i].dateKey, days[i - 1].dateKey));
    }

    // D) Encouragements utilisés (si la table existe)
    let encouragementsUsed = 0;
    try {
      // Use any to bypass TypeScript table validation since this table might not exist
      const { count } = await (supabase as any)
        .from('encouragement_events')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      encouragementsUsed = count || 0;
    } catch (e) {
      // La table peut ne pas exister, on garde 0
      encouragementsUsed = 0;
    }

    // E) Préparer données pour badges "book_completed"
    const booksNeeded = Array.from(
      new Set(
        lockedBadges
          .filter(b => b.criteria?.type === 'book_completed')
          .map(b => (b.criteria?.book || '').trim())
          .filter((x: string) => x.length > 0)
      )
    ) as string[];

    let chaptersByBook: Record<string, string[]> = {};
    if (booksNeeded.length > 0) {
      const orFilter = booksNeeded
        .map(book => `reference.ilike.${book.replace(/\./g, '\\.')}%`)
        .join(',');
      const { data: bookChapters } = await supabase
        .from('reading_plan_chapters')
        .select('id, reference')
        .eq('plan_id', userPlanId)
        .or(orFilter);

      const map: Record<string, string[]> = {};
      (bookChapters || []).forEach(ch => {
        const ref = ch.reference || '';
        const book = booksNeeded.find(b => ref.toLowerCase().startsWith(b.toLowerCase()));
        if (book) {
          if (!map[book]) map[book] = [];
          map[book].push(ch.id);
        }
      });
      chaptersByBook = map;
    }

    const completedChapterIds = new Set(
      (completedProgress || []).map(p => p.chapter_id).filter(Boolean) as string[]
    );

    // 3) Calculer la progression pour chaque badge
    const badgeProgress = lockedBadges.map(badge => {
      const c = badge.criteria || {};
      const type = c.type;
      const required = Number(c.count) || 0;

      let current = 0;
      let progress = 0;

      if (type === 'chapters_read') {
        current = completedChapters;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : 0;

      } else if (type === 'days_completed' || type === 'milestone') {
        current = completedDays;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : 0;

      } else if (type === 'streak_days') {
        current = currentStreak;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : (current > 0 ? 100 : 0);

      } else if (type === 'fixed_time_streak') {
        current = currentSameHourStreak;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : (current > 0 ? 100 : 0);

      } else if (type === 'time_of_day') {
        const period = String(c.period || '').toLowerCase();
        current = period === 'morning' ? morningDays : period === 'evening' ? eveningDays : 0;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : 0;

      } else if (type === 'resume_after_gap') {
        const gapDays = Number(c.gap_days) || 3;
        const hasResumed = gaps.some(g => g > gapDays);
        current = hasResumed ? 1 : 0;
        // Binaire: 0% ou 100%
        progress = hasResumed ? 100 : 0;

      } else if (type === 'encouragements_used') {
        current = encouragementsUsed;
        progress = required > 0 ? Math.min((current / required) * 100, 100) : (current > 0 ? 100 : 0);

      } else if (type === 'book_completed') {
        const book = (c.book || '').trim();
        const ids = chaptersByBook[book] || [];
        const totalInBook = ids.length;
        const completedInBook = ids.filter(id => completedChapterIds.has(id)).length;
        current = completedInBook;
        const req = required > 0 ? required : totalInBook; // si non défini, on considère tout le livre
        const denom = Math.max(req, totalInBook || req || 1);
        // Progression sur l'avancement réel du livre
        progress = denom > 0 ? Math.min((completedInBook / denom) * 100, 100) : 0;

      } else {
        // Type inconnu: pas de progression
        current = 0;
        progress = 0;
      }

      return {
        badge,
        progress: Math.round(progress),
        current,
        required: required || (type === 'book_completed' ? (chaptersByBook[(badge.criteria?.book || '').trim()]?.length || 0) : 0),
      };
    });

    // Trier par progression décroissante
    return badgeProgress.sort((a, b) => b.progress - a.progress);
  } catch (error) {
    console.error('Erreur lors du calcul de progression des badges:', error);
    return [];
  }
};

/**
 * Récupérer les statistiques de badges pour un utilisateur
 */
export const getBadgeStats = async (userId: string) => {
  try {
    const [allBadges, userBadges] = await Promise.all([
      getAllBadges(),
      getUserBadges(userId)
    ]);

    return {
      totalBadges: allBadges.length,
      unlockedBadges: userBadges.length,
      progressPercentage: allBadges.length > 0 ? Math.round((userBadges.length / allBadges.length) * 100) : 0,
      latestBadges: userBadges.slice(0, 3) // 3 derniers badges débloqués
    };
  } catch (error) {
    console.error('Erreur getBadgeStats:', error);
    return {
      totalBadges: 0,
      unlockedBadges: 0,
      progressPercentage: 0,
      latestBadges: []
    };
  }
};
