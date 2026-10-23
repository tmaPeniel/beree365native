import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { BookOpen, Heart, Search, Share2 } from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDateService } from "@/features/reading/hooks/useDateService";
import { getDateForDay } from "@/features/reading/services/dateService";
import {
  getAllVersesUpToDay,
  getLikedVerseDays,
  setVerseLike,
} from "@/features/reading/services/readingPlan";
import type { DailyVerse } from "@/types/supabase";
import { MotionView, PressableScale } from "@/shared/animation/Motion";
import { colors, fonts } from "@/shared/theme/styles";

type LibraryFilter = "all" | "last7" | "last30" | "liked";

const filterOptions: Array<{ label: string; value: LibraryFilter }> = [
  { label: "Tous", value: "all" },
  { label: "7 jours", value: "last7" },
  { label: "30 jours", value: "last30" },
  { label: "Aimés", value: "liked" },
];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

function getVerseQuote(verse: DailyVerse) {
  return verse.text?.trim() || verse.wisdomType?.trim() || "Verset indisponible.";
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function capitalize(value: string) {
  return value.replace(/^./, (letter) => letter.toLocaleUpperCase("fr-FR"));
}

function getVerseDate(startDate: string | undefined, dayNumber: number) {
  return startDate ? getDateForDay(startDate, dayNumber) : "";
}

function getMonthLabel(dateValue: string) {
  if (!dateValue) return "Votre parcours";
  return capitalize(format(parseLocalDate(dateValue), "MMMM yyyy", { locale: fr }));
}

export function VersesLibraryScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentDayNumber, startDate } = useDateService();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [search, setSearch] = useState("");
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const maxDay = Math.max(1, Math.min(currentDayNumber, 365));
  const versesQueryKey = ["verse-library", maxDay] as const;
  const likedDaysQueryKey = ["liked-verse-days", user?.id, maxDay] as const;

  const versesQuery = useQuery({
    queryKey: versesQueryKey,
    queryFn: () => getAllVersesUpToDay(maxDay),
  });

  const likedDaysQuery = useQuery({
    queryKey: likedDaysQueryKey,
    queryFn: () => getLikedVerseDays(maxDay),
    enabled: !!user?.id,
  });

  const likedDays = useMemo(() => new Set(likedDaysQuery.data ?? []), [likedDaysQuery.data]);
  const normalizedSearch = normalizeSearch(search);

  const visibleVerses = useMemo(() => {
    const minimumDay = filter === "last7"
      ? Math.max(1, maxDay - 6)
      : filter === "last30"
        ? Math.max(1, maxDay - 29)
        : 1;

    return (versesQuery.data ?? []).filter((verse) => {
      if (verse.day_number < minimumDay) return false;
      if (filter === "liked" && !likedDays.has(verse.day_number)) return false;
      if (!normalizedSearch) return true;

      const searchableText = normalizeSearch([
        verse.reference,
        verse.text,
        verse.wisdomType,
        `jour ${verse.day_number}`,
      ].filter(Boolean).join(" "));

      return searchableText.includes(normalizedSearch);
    });
  }, [filter, likedDays, maxDay, normalizedSearch, versesQuery.data]);

  const refresh = () => {
    void Promise.all([versesQuery.refetch(), likedDaysQuery.refetch()]);
  };

  const shareVerse = async (verse: DailyVerse) => {
    await Share.share({
      message: `“${getVerseQuote(verse)}”\n\n${verse.reference}\nBérée 365 — Jour ${verse.day_number}`,
      title: verse.reference,
    });
  };

  const toggleLike = async (verse: DailyVerse) => {
    if (pendingDay !== null) return;

    const wasLiked = likedDays.has(verse.day_number);
    const previousLikedDays = likedDaysQuery.data ?? [];
    const nextLikedDays = wasLiked
      ? previousLikedDays.filter((day) => day !== verse.day_number)
      : [verse.day_number, ...previousLikedDays];

    setPendingDay(verse.day_number);
    queryClient.setQueryData(likedDaysQueryKey, nextLikedDays);
    queryClient.setQueryData<DailyVerse[]>(versesQueryKey, (current) =>
      current?.map((item) => item.day_number === verse.day_number
        ? { ...item, likes_count: Math.max(0, (item.likes_count ?? 0) + (wasLiked ? -1 : 1)) }
        : item),
    );

    try {
      await setVerseLike(verse.day_number, !wasLiked);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: versesQueryKey }),
        queryClient.invalidateQueries({ queryKey: likedDaysQueryKey }),
      ]);
    } catch {
      queryClient.setQueryData(likedDaysQueryKey, previousLikedDays);
      queryClient.setQueryData<DailyVerse[]>(versesQueryKey, (current) =>
        current?.map((item) => item.day_number === verse.day_number
          ? { ...item, likes_count: Math.max(0, (item.likes_count ?? 0) + (wasLiked ? 1 : -1)) }
          : item),
      );
      Alert.alert("J'aime", "Impossible de modifier ce J'aime pour le moment.");
    } finally {
      setPendingDay(null);
    }
  };

  const isInitialLoading = versesQuery.isLoading || likedDaysQuery.isLoading;
  const hasError = versesQuery.isError || likedDaysQuery.isError;
  const isRefreshing = versesQuery.isRefetching || likedDaysQuery.isRefetching;

  if (isInitialLoading) {
    return (
      <View style={screenStyles.centerState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={screenStyles.stateText}>Chargement de vos versets…</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={screenStyles.centerState}>
        <BookOpen color={colors.primary} size={30} strokeWidth={1.8} />
        <Text style={screenStyles.stateTitle}>Les versets ne sont pas disponibles</Text>
        <Text style={screenStyles.stateText}>Vérifiez votre connexion puis réessayez.</Text>
        <Pressable onPress={refresh} style={screenStyles.retryButton}>
          <Text style={screenStyles.retryButtonText}>Réessayer</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={[screenStyles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
      data={visibleVerses}
      initialNumToRender={8}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      keyExtractor={(item) => item.id}
      ListEmptyComponent={(
        <View style={screenStyles.emptyState}>
          <BookOpen color={colors.primary} size={28} strokeWidth={1.8} />
          <Text style={screenStyles.stateTitle}>
            {filter === "liked" ? "Aucun verset aimé" : "Aucun résultat"}
          </Text>
          <Text style={screenStyles.stateText}>
            {filter === "liked"
              ? "Touchez le cœur d'un verset pour le retrouver ici."
              : "Essayez un autre mot, une référence ou un autre filtre."}
          </Text>
        </View>
      )}
      ListHeaderComponent={(
        <View style={screenStyles.header}>
          <MotionView>
            <Text maxFontSizeMultiplier={1.25} style={screenStyles.title}>Vos versets, jour après jour</Text>
            <Text maxFontSizeMultiplier={1.35} style={screenStyles.subtitle}>
              Retrouvez les paroles découvertes depuis le début de votre parcours.
            </Text>
          </MotionView>

          <View style={screenStyles.searchField}>
            <Search color={colors.muted} size={19} strokeWidth={1.9} />
            <TextInput
              accessibilityLabel="Rechercher dans les versets"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearch}
              placeholder="Référence, thème ou mot-clé"
              placeholderTextColor={colors.muted}
              returnKeyType="search"
              style={screenStyles.searchInput}
              value={search}
            />
          </View>

          <View style={screenStyles.filters}>
            {filterOptions.map((item) => {
              const active = filter === item.value;
              return (
                <Pressable
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(item.value)}
                  style={({ pressed }) => [
                    screenStyles.filterButton,
                    active && screenStyles.filterButtonActive,
                    pressed && screenStyles.pressed,
                  ]}
                >
                  <Text style={[screenStyles.filterText, active && screenStyles.filterTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={screenStyles.resultSummary}>
            <Text style={screenStyles.resultCount}>
              {visibleVerses.length} verset{visibleVerses.length > 1 ? "s" : ""}
            </Text>
            <Text style={screenStyles.resultRange}>Jours 1 à {maxDay}</Text>
          </View>
        </View>
      )}
      maxToRenderPerBatch={10}
      refreshControl={(
        <RefreshControl
          colors={[colors.primary]}
          onRefresh={refresh}
          refreshing={isRefreshing}
          tintColor={colors.primary}
        />
      )}
      removeClippedSubviews
      renderItem={({ item, index }) => {
        const liked = likedDays.has(item.day_number);
        const isPending = pendingDay === item.day_number;
        const verseDate = getVerseDate(startDate, item.day_number);
        const monthLabel = getMonthLabel(verseDate);
        const previousVerse = visibleVerses[index - 1];
        const previousMonthLabel = previousVerse
          ? getMonthLabel(getVerseDate(startDate, previousVerse.day_number))
          : null;
        const showMonthHeader = index === 0 || monthLabel !== previousMonthLabel;

        return (
          <View>
            {showMonthHeader ? (
              <Text style={screenStyles.monthTitle}>{monthLabel}</Text>
            ) : null}

            <MotionView delay={Math.min(index, 5) * 35} layout={false} style={screenStyles.verseRow}>
              <View style={screenStyles.dayColumn}>
                <Text style={screenStyles.dayLabel}>JOUR {item.day_number}</Text>
                <Text style={screenStyles.dayNumber}>
                  {verseDate ? format(parseLocalDate(verseDate), "d", { locale: fr }) : item.day_number}
                </Text>
                {verseDate ? (
                  <Text style={screenStyles.dayMonth}>
                    {format(parseLocalDate(verseDate), "MMM", { locale: fr }).replace(".", "").toLocaleUpperCase("fr-FR")}
                  </Text>
                ) : null}
              </View>

              <View style={screenStyles.verseContent}>
                <Text maxFontSizeMultiplier={1.3} style={screenStyles.reference}>{item.reference}</Text>

                <Text maxFontSizeMultiplier={1.4} style={screenStyles.quote}>
                  “{getVerseQuote(item)}”
                </Text>

                <View style={screenStyles.verseFooter}>
                  {!!item.wisdomType ? (
                    <View style={screenStyles.themeChip}>
                      <Text maxFontSizeMultiplier={1.25} numberOfLines={1} style={screenStyles.theme}>
                        {item.wisdomType}
                      </Text>
                    </View>
                  ) : <View />}

                  <View style={screenStyles.actions}>
                    <PressableScale
                      accessibilityLabel={liked ? "Retirer le J'aime" : "Aimer ce verset"}
                      accessibilityRole="button"
                      disabled={pendingDay !== null}
                      hitSlop={8}
                      onPress={() => void toggleLike(item)}
                      style={({ pressed }) => [screenStyles.actionButton, pressed && screenStyles.pressed]}
                    >
                      {isPending ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Heart
                          color={liked ? colors.primary : colors.muted}
                          fill={liked ? colors.primary : "transparent"}
                          size={20}
                          strokeWidth={1.9}
                        />
                      )}
                      {(item.likes_count ?? 0) > 0 ? (
                        <Text style={[screenStyles.actionText, liked && screenStyles.actionTextActive]}>
                          {item.likes_count}
                        </Text>
                      ) : null}
                    </PressableScale>

                    <PressableScale
                      accessibilityLabel={`Partager ${item.reference}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => void shareVerse(item)}
                      style={({ pressed }) => [screenStyles.actionButton, pressed && screenStyles.pressed]}
                    >
                      <Share2 color={colors.muted} size={19} strokeWidth={1.9} />
                    </PressableScale>
                  </View>
                </View>
              </View>
            </MotionView>
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
      style={screenStyles.screen}
      windowSize={7}
    />
  );
}

const screenStyles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 44,
    minWidth: 38,
    justifyContent: "center",
  },
  actionText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  actionTextActive: {
    color: colors.primary,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  centerState: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 10,
    justifyContent: "center",
    padding: 28,
  },
  content: {
    paddingHorizontal: 20,
  },
  dayColumn: {
    alignItems: "flex-start",
    borderRightColor: colors.border,
    borderRightWidth: StyleSheet.hairlineWidth,
    minWidth: 84,
    paddingRight: 14,
  },
  dayLabel: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  dayNumber: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 32,
    lineHeight: 37,
    marginTop: 4,
  },
  dayMonth: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 1,
  },
  emptyState: {
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 24,
    paddingVertical: 54,
  },
  filterButton: {
    alignItems: "center",
    borderBottomColor: "transparent",
    borderBottomWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 4,
  },
  filterButtonActive: {
    borderBottomColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.primary,
    fontFamily: fonts.semibold,
  },
  filters: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
  },
  header: {
    gap: 18,
    paddingBottom: 8,
    paddingTop: 22,
  },
  monthTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
    paddingBottom: 10,
    paddingTop: 26,
    textTransform: "capitalize",
  },
  pressed: {
    opacity: 0.66,
  },
  quote: {
    color: colors.text,
    fontFamily: fonts.regularItalic,
    fontSize: 16,
    lineHeight: 26,
  },
  reference: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
  },
  resultCount: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  resultRange: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  resultSummary: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: "center",
    marginTop: 6,
    minHeight: 48,
    paddingHorizontal: 22,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 16,
    minHeight: 46,
    paddingVertical: 0,
  },
  stateText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  stateTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
  },
  theme: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  themeChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    flexShrink: 1,
    maxWidth: "62%",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 24,
    lineHeight: 30,
  },
  verseContent: {
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  verseFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  verseRow: {
    alignItems: "flex-start",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 16,
    paddingVertical: 20,
  },
});
