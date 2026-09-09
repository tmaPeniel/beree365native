import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDateService } from "@/features/reading/hooks/useDateService";
import { getUserProgressForDay, toggleChapterStatus } from "@/features/reading/services/readingPlan";
import { colors, fonts, styles } from "@/shared/theme/styles";

type DayProgress = Awaited<ReturnType<typeof getUserProgressForDay>>;

export function ReadingScreen() {
  const queryClient = useQueryClient();
  const { user, triggerProgressUpdate } = useAuth();
  const { currentDayNumber, goToNext, goToPrevious, planDuration } = useDateService();

  const chaptersQuery = useQuery({
    queryKey: ["mobile-reading-day", user?.id, currentDayNumber],
    queryFn: () => getUserProgressForDay(user.id, currentDayNumber),
    enabled: !!user?.id && currentDayNumber > 0,
  });

  const toggleChapter = async (chapterId: string, status: "pending" | "completed") => {
    if (!user?.id) return;

    const queryKey = ["mobile-reading-day", user.id, currentDayNumber] as const;
    const previousProgress = queryClient.getQueryData<DayProgress>(queryKey);
    const nextStatus = status === "completed" ? "pending" : "completed";

    queryClient.setQueryData<DayProgress>(queryKey, (current) =>
      current?.map((item) =>
        item.chapter_id === chapterId
          ? {
              ...item,
              completed_at: nextStatus === "completed" ? new Date().toISOString() : null,
              status: nextStatus,
            }
          : item
      )
    );

    try {
      const result = await toggleChapterStatus(user.id, chapterId, status);
      if (!result.success) {
        throw new Error(result.error || "La progression n'a pas pu être enregistrée.");
      }
      triggerProgressUpdate();
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["mobile-day-progress", user.id] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-progress", user.id] });
    } catch (error: any) {
      queryClient.setQueryData(queryKey, previousProgress);
      Alert.alert("Progression", error.message || "Impossible de modifier ce passage.");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={{ gap: 4 }}>
        <Text style={styles.tinyLabel}>Lecture</Text>
        <Text style={styles.heading}>Jour {currentDayNumber}</Text>
        <Text style={styles.subheading}>Parcourez les passages et marquez-les comme lus.</Text>
      </View>

      <View style={styles.row}>
        <Pressable onPress={goToPrevious} style={[styles.secondaryButton, { flex: 1 }]}>
          <Text style={styles.secondaryButtonText}>Précédent</Text>
        </Pressable>
        <Pressable onPress={goToNext} style={[styles.secondaryButton, { flex: 1 }]}>
          <Text style={styles.secondaryButtonText}>
            {currentDayNumber >= planDuration ? "Terminé" : "Suivant"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {chaptersQuery.isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          chaptersQuery.data?.map((item) => {
            const chapter = item.reading_plan_chapters;
            const done = item.status === "completed";
            return (
              <Pressable
                key={chapter.id}
                onPress={() => toggleChapter(chapter.id, item.status)}
                style={[
                  {
                    backgroundColor: done ? colors.surfaceSoft : colors.surface,
                    borderColor: done ? colors.primary : colors.border,
                    borderRadius: 8,
                    borderWidth: 1,
                    gap: 4,
                    padding: 14,
                  },
                ]}
              >
                <Text style={{ color: colors.text, fontFamily: fonts.semibold, fontSize: 17 }}>
                  {chapter.reference}
                </Text>
                {!!chapter.description && <Text style={styles.subheading}>{chapter.description}</Text>}
                <Text style={{ color: done ? colors.primary : colors.muted, fontFamily: fonts.medium }}>
                  {done ? "Passage lu" : "Marquer comme lu"}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }}>
        TODO: migrer la vue complète du plan avec FlatList, recherche biblique et détail par jour.
      </Text>
    </ScrollView>
  );
}
