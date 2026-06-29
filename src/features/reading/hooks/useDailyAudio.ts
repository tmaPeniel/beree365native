import { useQuery } from "@tanstack/react-query";
import { getDailyAudio } from "@/features/reading/services/audioService";

export function useDailyAudio(planId: string | null | undefined, dayNumber: number | null | undefined) {
  const query = useQuery({
    queryKey: ["mobile-daily-audio", planId, dayNumber],
    queryFn: () => getDailyAudio(planId!, dayNumber!),
    enabled: !!planId && !!dayNumber && dayNumber > 0,
    staleTime: 1000 * 60 * 10,
  });

  return {
    audio: query.data ?? null,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
