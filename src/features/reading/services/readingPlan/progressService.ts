import { supabase } from "@/integrations/supabase/client";
import { ReadingPlanChapter, UserProgress } from "@/types/supabase";
import { ProgressMetrics } from "@/types/progress";
import { ActivityService } from "@/features/auth/services/auth/activityService";
import { calculateUserBadges } from "@/features/profile/services/badgeService";
import { getChaptersForDay, getUserSelectedPlanId } from "./helpers/planRetrieval";
import {
  calculatePercentage,
  getCompletedChaptersCount,
  getCompletedDaysViaRPC,
} from "./helpers/progressCalculation";
import { logger } from "@/shared/utils/logger";

export type ReadingPlanProgressPassage = ReadingPlanChapter & {
  status: "pending" | "completed";
  completed_at: string | null;
};

export type ReadingPlanProgressDay = {
  day_number: number;
  passages: ReadingPlanProgressPassage[];
};

export const getUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    if (!userId) return [];

    const planId = await getUserSelectedPlanId(userId);
    if (!planId) return [];

    const chapters = await getChaptersForDay(dayNumber, planId);
    if (chapters.length === 0) return [];

    const chapterIds = chapters.map((chapter) => chapter.id);
    const { data: progressData, error } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .in("chapter_id", chapterIds);

    if (error) return [];

    return chapters.map((chapter) => {
      const progressItem = progressData?.find((item) => item.chapter_id === chapter.id);

      return {
        id: progressItem?.id || `temp-${chapter.id}`,
        user_id: userId,
        chapter_id: chapter.id,
        status: progressItem?.status || ("pending" as const),
        completed_at: progressItem?.completed_at || null,
        reading_plan_chapters: chapter,
      };
    }) as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    logger.error("Get user progress error", error);
    return [];
  }
};

export const getUserReadingPlanProgress = async (userId: string): Promise<ReadingPlanProgressDay[]> => {
  try {
    if (!userId) return [];

    const planId = await getUserSelectedPlanId(userId);
    if (!planId) return [];

    const { data: chapters, error: chaptersError } = await supabase
      .from("reading_plan_chapters")
      .select("*")
      .eq("plan_id", planId)
      .order("day_number", { ascending: true });

    if (chaptersError) throw chaptersError;
    if (!chapters?.length) return [];

    const chapterIds = chapters.map((chapter) => chapter.id);
    const chapterIdSet = new Set(chapterIds);
    const { data: progressData, error: progressError } = await supabase
      .from("user_progress")
      .select("chapter_id,status,completed_at")
      .eq("user_id", userId);

    if (progressError) throw progressError;

    const progressByChapterId = new Map(
      (progressData || [])
        .filter((item) => chapterIdSet.has(item.chapter_id))
        .map((item) => [item.chapter_id, item])
    );

    const days = new Map<number, ReadingPlanProgressPassage[]>();

    sortChapters(chapters).forEach((chapter) => {
      const progressItem = progressByChapterId.get(chapter.id);
      const dayNumber = chapter.day_number || 1;
      const passages = days.get(dayNumber) || [];

      passages.push({
        ...(chapter as ReadingPlanChapter),
        status: progressItem?.status === "completed" ? "completed" : "pending",
        completed_at: progressItem?.completed_at || null,
      });

      days.set(dayNumber, passages);
    });

    return Array.from(days.entries()).map(([day_number, passages]) => ({
      day_number,
      passages,
    }));
  } catch (error) {
    logger.error("Get full reading plan progress error", error);
    return [];
  }
};

function sortChapters<T extends { day_number?: number | null; reference?: string | null }>(chapters: T[]) {
  return [...chapters].sort((left, right) => {
    const leftDay = left.day_number || 0;
    const rightDay = right.day_number || 0;

    if (leftDay !== rightDay) {
      return leftDay - rightDay;
    }

    const leftOrder = getSortOrder(left);
    const rightOrder = getSortOrder(right);

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.reference || "").localeCompare(String(right.reference || ""), "fr", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function getSortOrder(chapter: unknown) {
  const value = (chapter as { sort_order?: unknown })?.sort_order;
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

export const toggleChapterStatus = async (
  userId: string,
  chapterId: string,
  currentStatus: "pending" | "completed"
) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return { success: false, error: "Utilisateur non authentifié" };
  }

  const newStatus = currentStatus === "pending" ? "completed" : "pending";
  const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

  try {
    const { data: existingEntries } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("chapter_id", chapterId);

    if (existingEntries && existingEntries.length > 0) {
      const { data, error } = await supabase
        .from("user_progress")
        .update({ status: newStatus, completed_at: completedAt })
        .eq("user_id", userId)
        .eq("chapter_id", chapterId)
        .select();

      if (error) throw error;
      await ActivityService.updateUserActivity(userId);
      await calculateUserBadges(userId);
      return { success: true, data };
    }

    const { data, error } = await supabase
      .from("user_progress")
      .insert([{ user_id: userId, chapter_id: chapterId, status: newStatus, completed_at: completedAt }])
      .select();

    if (error) throw error;
    await ActivityService.updateUserActivity(userId);
    await calculateUserBadges(userId);
    return { success: true, data };
  } catch (error: any) {
    logger.error("Toggle status error", error);
    return { success: false, error: error.message };
  }
};

export const getDayProgress = async (userId: string, dayNumber: number) => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) return 0;

    const chapters = await getChaptersForDay(dayNumber, planId);
    if (chapters.length === 0) return 0;

    const chapterIds = chapters.map((chapter) => chapter.id);
    const completedCount = await getCompletedChaptersCount(userId, chapterIds);

    return calculatePercentage(completedCount, chapters.length);
  } catch (error) {
    logger.error("Get day progress error", error);
    return 0;
  }
};

export const getCompletedDaysCount = async (userId: string) => {
  try {
    const rpcResult = await getCompletedDaysViaRPC(userId);
    if (rpcResult !== null) return rpcResult;
    return await getCompletedDaysCountFallback(userId);
  } catch (error) {
    logger.error("Get completed days error", error);
    return 0;
  }
};

const getCompletedDaysCountFallback = async (userId: string): Promise<number> => {
  const planId = await getUserSelectedPlanId(userId);
  if (!planId) return 0;

  const { data: allDays } = await supabase
    .from("reading_plan_chapters")
    .select("day_number")
    .eq("plan_id", planId)
    .order("day_number");

  if (!allDays) return 0;

  const uniqueDays = [...new Set(allDays.map((day) => day.day_number).filter(Boolean))];
  let completedCount = 0;

  for (const dayNumber of uniqueDays) {
    const progress = await getDayProgress(userId, dayNumber);
    if (progress === 100) completedCount++;
  }

  return completedCount;
};

export const getOverallProgress = async (userId: string): Promise<ProgressMetrics> => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) {
      return {
        totalPassages: 0,
        passagesRead: 0,
        passagesRemaining: 0,
        progressPercentage: 0,
        completedDays: 0,
      };
    }

    const { count: totalCount } = await supabase
      .from("reading_plan_chapters")
      .select("*", { count: "exact", head: true })
      .eq("plan_id", planId);

    const { count: completedCount } = await supabase
      .from("user_progress")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed");

    const completedDays = await getCompletedDaysCount(userId);

    return {
      totalPassages: totalCount || 0,
      passagesRead: completedCount || 0,
      passagesRemaining: (totalCount || 0) - (completedCount || 0),
      progressPercentage: calculatePercentage(completedCount || 0, totalCount || 0),
      completedDays,
    };
  } catch (error) {
    logger.error("Get overall progress error", error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0,
      completedDays: 0,
    };
  }
};
