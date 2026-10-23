import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  List,
  Search,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutUp,
  useReducedMotion,
} from "react-native-reanimated";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  FloatingAudioPlayer,
} from "@/features/reading/components/AudioPlayer";
import { useDailyAudio } from "@/features/reading/hooks/useDailyAudio";
import { useDateService } from "@/features/reading/hooks/useDateService";
import { usePlanDuration } from "@/features/reading/hooks/usePlanDuration";
import { getDateForDay } from "@/features/reading/services/dateService";
import {
  getUserReadingPlanProgress,
  toggleChapterStatus,
  type ReadingPlanProgressDay,
  type ReadingPlanProgressPassage,
} from "@/features/reading/services/readingPlan";
import { AnimatedProgressBar, MotionView, PressableScale } from "@/shared/animation/Motion";
import { useAdaptiveLayout } from "@/shared/layout/adaptive";
import { fonts } from "@/shared/theme/styles";

type ReadingViewMode = "focus" | "grid";
type DayReadingState = "pending" | "in-progress" | "completed";

const READING_VIEW_MODE_KEY = "reading-view-mode";
const DAY_RAIL_ITEM_WIDTH = 68;
const DAY_RAIL_ITEM_GAP = 6;

const COLORS = {
  background: "#f8f6f3",
  card: "#ffffff",
  cardSoft: "#fbfaf8",
  ink: "#2f261f",
  muted: "#7e6f64",
  border: "#eadfd4",
  copper: "#b76620",
  copperDark: "#2d2018",
  chip: "#f5ece5",
  danger: "#b42318",
};

export function ReadingPlanScreen() {
  const { isTablet } = useAdaptiveLayout();
  const queryClient = useQueryClient();
  const { user, profile, triggerProgressUpdate } = useAuth();
  const { currentDayNumber, isLoading: dateLoading } = useDateService();
  const { planName } = usePlanDuration();
  const [viewMode, setViewMode] = useState<ReadingViewMode>("focus");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDayNumber, setSelectedDayNumber] = useState<number | null>(null);
  const [visibleMonthKey, setVisibleMonthKey] = useState<string | null>(null);
  const [didInitializeCurrentDay, setDidInitializeCurrentDay] = useState(false);

  const planQueryKey = useMemo(
    () => ["mobile-reading-plan-progress", user?.id] as const,
    [user?.id],
  );

  const planQuery = useQuery({
    queryKey: planQueryKey,
    queryFn: () => getUserReadingPlanProgress(user!.id),
    enabled: !!user?.id,
  });

  const readingDays = planQuery.data || [];
  const startDate = profile?.start_date || "";
  const activeDayNumber = selectedDayNumber || currentDayNumber || 1;
  const selectedDay =
    readingDays.find((day) => day.day_number === activeDayNumber) ||
    readingDays.find((day) => day.day_number === currentDayNumber) ||
    readingDays[0];
  const {
    audio,
    loading: audioLoading,
    error: audioError,
  } = useDailyAudio(profile?.selected_plan_id, selectedDay?.day_number);
  const audioWithPassages = useMemo(() => {
    if (!audio) return null;

    return {
      ...audio,
      passageReferences: selectedDay?.passages
        .map((passage) => passage.reference.trim())
        .filter(Boolean) || [],
    };
  }, [audio, selectedDay]);
  const monthKeys = useMemo(
    () => getMonthKeys(readingDays, startDate),
    [readingDays, startDate],
  );

  const progressPercentage = useMemo(() => {
    const passages = readingDays.flatMap((day) => day.passages);
    if (!passages.length) return 0;
    const completed = passages.filter((passage) => passage.status === "completed").length;
    return Math.round((completed / passages.length) * 100);
  }, [readingDays]);

  useEffect(() => {
    AsyncStorage.getItem(READING_VIEW_MODE_KEY)
      .then((storedMode) => {
        if (storedMode === "focus" || storedMode === "grid") {
          setViewMode(storedMode);
        }
      })
      .catch(() => {
        // La préférence locale ne doit jamais bloquer l'écran.
      });
  }, []);

  useEffect(() => {
    setDidInitializeCurrentDay(false);
    setSelectedDayNumber(null);
    setVisibleMonthKey(null);
  }, [startDate, user?.id]);

  useEffect(() => {
    if (didInitializeCurrentDay || dateLoading || !startDate || !currentDayNumber || !readingDays.length) {
      return;
    }

    setSelectedDayNumber(currentDayNumber);
    setVisibleMonthKey(getMonthKey(getDateForDay(startDate, currentDayNumber)));
    setDidInitializeCurrentDay(true);
  }, [currentDayNumber, dateLoading, didInitializeCurrentDay, readingDays.length, startDate]);

  const updateViewMode = useCallback((nextMode: ReadingViewMode) => {
    setViewMode(nextMode);
    AsyncStorage.setItem(READING_VIEW_MODE_KEY, nextMode).catch(() => {
      // Non bloquant : l'utilisateur pourra simplement rechanger la vue au prochain lancement.
    });
  }, []);

  const goToCurrentDayInGrid = useCallback(() => {
    if (!startDate || !currentDayNumber) return;

    setSearchQuery("");
    setSelectedDayNumber(currentDayNumber);
    setVisibleMonthKey(getMonthKey(getDateForDay(startDate, currentDayNumber)));
  }, [currentDayNumber, startDate]);

  const openDayInFocus = useCallback((day: ReadingPlanProgressDay) => {
    setSelectedDayNumber(day.day_number);
    if (startDate) {
      setVisibleMonthKey(getMonthKey(getDateForDay(startDate, day.day_number)));
    }
    updateViewMode("focus");
  }, [startDate, updateViewMode]);

  const invalidateReadingCaches = useCallback(async () => {
    if (!user?.id) return;

    triggerProgressUpdate();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: planQueryKey, refetchType: "none" }),
      queryClient.invalidateQueries({ queryKey: ["mobile-reading-day", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-day-progress", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-progress", user.id] }),
    ]);
  }, [planQueryKey, queryClient, triggerProgressUpdate, user?.id]);

  const cancelReadingCaches = useCallback(async () => {
    if (!user?.id) return;

    await Promise.all([
      queryClient.cancelQueries({ queryKey: planQueryKey }),
      queryClient.cancelQueries({ queryKey: ["mobile-reading-day", user.id] }),
      queryClient.cancelQueries({ queryKey: ["mobile-day-progress", user.id] }),
      queryClient.cancelQueries({ queryKey: ["mobile-progress", user.id] }),
    ]);
  }, [planQueryKey, queryClient, user?.id]);

  const setChapterInCache = useCallback((chapterId: string, status: "pending" | "completed") => {
    queryClient.setQueryData<ReadingPlanProgressDay[]>(planQueryKey, (current) =>
      current?.map((day) => ({
        ...day,
        passages: day.passages.map((passage) =>
          passage.id === chapterId
            ? {
                ...passage,
                completed_at: status === "completed" ? new Date().toISOString() : null,
                status,
              }
            : passage,
        ),
      })),
    );
  }, [planQueryKey, queryClient]);

  const togglePassage = useCallback(async (passage: ReadingPlanProgressPassage) => {
    if (!user?.id) return;

    await cancelReadingCaches();
    const previousProgress = queryClient.getQueryData<ReadingPlanProgressDay[]>(planQueryKey);
    const nextStatus = passage.status === "completed" ? "pending" : "completed";
    setChapterInCache(passage.id, nextStatus);

    try {
      const result = await toggleChapterStatus(user.id, passage.id, passage.status);
      if (!result.success) {
        throw new Error(result.error || "La progression n'a pas pu être enregistrée.");
      }
      await invalidateReadingCaches();
    } catch (error: any) {
      queryClient.setQueryData(planQueryKey, previousProgress);
      Alert.alert("Progression", error.message || "Impossible de modifier ce passage.");
    }
  }, [cancelReadingCaches, invalidateReadingCaches, planQueryKey, queryClient, setChapterInCache, user?.id]);

  const isLoading = dateLoading || planQuery.isLoading;
  const currentVisibleMonthKey = visibleMonthKey || monthKeys[0] || null;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isTablet && styles.tabletContent]}
        refreshControl={
          <RefreshControl
            refreshing={planQuery.isRefetching}
            tintColor={COLORS.copper}
            onRefresh={() => void planQuery.refetch()}
          />
        }
      >
        <MotionView style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Plan de lecture</Text>
            <Text style={styles.subtitle}>Suivez votre progression au fil des jours</Text>
          </View>

          <View style={styles.viewSwitcher}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vue focus"
              onPress={() => updateViewMode("focus")}
              style={[styles.switchButton, viewMode === "focus" && styles.switchButtonActive]}
            >
              <List size={18} color={viewMode === "focus" ? "#fff" : COLORS.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vue grille"
              onPress={() => updateViewMode("grid")}
              style={[styles.switchButton, viewMode === "grid" && styles.switchButtonActive]}
            >
              <Grid2X2 size={17} color={viewMode === "grid" ? "#fff" : COLORS.muted} />
            </Pressable>
          </View>
        </MotionView>

        {isLoading ? (
          <MotionView style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.copper} />
            <Text style={styles.loadingText}>Chargement de votre plan...</Text>
          </MotionView>
        ) : !readingDays.length || !selectedDay ? (
          <MotionView style={styles.loadingCard}>
            <Text style={styles.emptyTitle}>Aucun passage trouvé</Text>
            <Text style={styles.emptyText}>
              Vérifiez qu'un plan de lecture actif est bien associé à votre profil.
            </Text>
          </MotionView>
        ) : viewMode === "focus" ? (
          <FocusView
            currentDayNumber={currentDayNumber}
            globalProgress={progressPercentage}
            planName={planName}
            readingDays={readingDays}
            selectedDay={selectedDay}
            startDate={startDate}
            onSelectDay={setSelectedDayNumber}
            onTogglePassage={togglePassage}
          />
        ) : (
          <GridView
            currentDayNumber={currentDayNumber}
            monthKeys={monthKeys}
            readingDays={readingDays}
            searchQuery={searchQuery}
            selectedDayNumber={activeDayNumber}
            startDate={startDate}
            visibleMonthKey={currentVisibleMonthKey}
            onChangeMonth={setVisibleMonthKey}
            onClearSearch={() => setSearchQuery("")}
            onGoToCurrentDay={goToCurrentDayInGrid}
            onOpenDay={openDayInFocus}
            onSearchChange={setSearchQuery}
            onSelectDay={setSelectedDayNumber}
            onTogglePassage={togglePassage}
          />
        )}
      </ScrollView>
      <FloatingAudioPlayer error={audioError} loading={audioLoading} source={audioWithPassages} />
    </View>
  );
}

function FocusView({
  currentDayNumber,
  globalProgress,
  planName,
  readingDays,
  selectedDay,
  startDate,
  onSelectDay,
  onTogglePassage,
}: {
  currentDayNumber: number;
  globalProgress: number;
  planName?: string | null;
  readingDays: ReadingPlanProgressDay[];
  selectedDay: ReadingPlanProgressDay;
  startDate: string;
  onSelectDay: (dayNumber: number) => void;
  onTogglePassage: (passage: ReadingPlanProgressPassage) => void;
}) {
  const selectedIndex = readingDays.findIndex((day) => day.day_number === selectedDay.day_number);
  const safeSelectedIndex = selectedIndex >= 0 ? selectedIndex : 0;
  const railRef = useRef<FlatList<ReadingPlanProgressDay>>(null);
  const reducedMotion = useReducedMotion();
  const showReturnToCurrentDay =
    selectedDay.day_number !== currentDayNumber &&
    readingDays.some((day) => day.day_number === currentDayNumber);

  useEffect(() => {
    if (selectedIndex < 0) return;

    requestAnimationFrame(() => {
      railRef.current?.scrollToIndex({
        animated: true,
        index: selectedIndex,
        viewPosition: 0.5,
      });
    });
  }, [selectedIndex]);

  return (
    <>
      <MotionView delay={70} style={styles.planSummary}>
        <View style={styles.planSummaryRow}>
          <Text numberOfLines={1} style={styles.planSummaryName}>
            {planName || "Plan de lecture"}
          </Text>
          <Text style={styles.planSummaryPercent}>{globalProgress}%</Text>
        </View>
        <AnimatedProgressBar
          fillStyle={styles.planSummaryProgressFill}
          minPercent={4}
          progress={globalProgress}
          style={styles.planSummaryProgressTrack}
        />
      </MotionView>

      <MotionView delay={150}>
      <FlatList
        ref={railRef}
        data={readingDays}
        horizontal
        initialScrollIndex={safeSelectedIndex}
        keyExtractor={(item) => String(item.day_number)}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dayRail}
        getItemLayout={(_, index) => ({
          index,
          length: DAY_RAIL_ITEM_WIDTH + DAY_RAIL_ITEM_GAP,
          offset: (DAY_RAIL_ITEM_WIDTH + DAY_RAIL_ITEM_GAP) * index,
        })}
        onScrollToIndexFailed={(info) => {
          requestAnimationFrame(() => {
            railRef.current?.scrollToOffset({
              animated: false,
              offset: Math.max(0, info.averageItemLength * info.index),
            });
          });
        }}
        renderItem={({ item }) => {
          const active = item.day_number === selectedDay.day_number;
          const isToday = item.day_number === currentDayNumber;
          const readingState = getDayReadingState(item);
          const itemDate = getDayDate(startDate, item.day_number);
          return (
            <Pressable
              accessibilityLabel={`Afficher le jour ${item.day_number}`}
              accessibilityRole="button"
              onPress={() => onSelectDay(item.day_number)}
              style={({ pressed }) => [
                styles.dayPill,
                readingState === "in-progress" && styles.dayPillInProgress,
                readingState === "completed" && styles.dayPillCompleted,
                active && styles.dayPillActive,
                pressed && styles.dayPillPressed,
              ]}
            >
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={[styles.dayPillWeekday, active && styles.dayPillWeekdayActive]}
              >
                {isToday ? "Aujourd’hui" : formatWeekdayShort(itemDate)}
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={[styles.dayPillDateNumber, active && styles.dayPillDateNumberActive]}
              >
                {formatDayNumber(itemDate)}
              </Text>
              <View
                style={[
                  styles.dayPillStateMarker,
                  readingState === "in-progress" && styles.dayPillStateMarkerInProgress,
                  readingState === "completed" && styles.dayPillStateMarkerCompleted,
                ]}
              />
            </Pressable>
          );
        }}
      />
      </MotionView>

      {showReturnToCurrentDay ? (
        <Animated.View
          entering={reducedMotion
            ? undefined
            : FadeInDown.duration(280).easing(Easing.out(Easing.cubic))}
          exiting={reducedMotion
            ? undefined
            : FadeOutUp.duration(180).easing(Easing.in(Easing.cubic))}
          style={styles.returnToCurrentDayRow}
        >
          <PressableScale
            accessibilityLabel={`Revenir au jour de lecture ${currentDayNumber}`}
            onPress={() => onSelectDay(currentDayNumber)}
            pressedScale={0.97}
            style={styles.returnToCurrentDayButton}
          >
            <CalendarDays size={14} color={COLORS.copper} />
            <Text style={styles.returnToCurrentDayText}>Revenir à aujourd’hui</Text>
          </PressableScale>
        </Animated.View>
      ) : null}

      <MotionView key={`focus-day-${selectedDay.day_number}`} delay={90} style={styles.focusCard}>
        <View style={styles.focusCardHeader}>
          <View style={styles.focusTitleBlock}>
            <Text style={styles.focusDayLabel}>Jour {selectedDay.day_number}</Text>
            <Text style={styles.focusDate}>
              {formatLongDate(getDayDate(startDate, selectedDay.day_number))}
            </Text>
          </View>
          <Text style={styles.focusPassageCount}>
            {selectedDay.passages.filter((passage) => passage.status === "completed").length}/{selectedDay.passages.length}
          </Text>
        </View>

        <View style={styles.focusPassages}>
          {selectedDay.passages.map((passage, index) => (
            <MotionView key={passage.id} delay={150 + index * 55}>
              <PassageRow
                checked={passage.status === "completed"}
                passage={passage}
                onToggle={() => onTogglePassage(passage)}
              />
            </MotionView>
          ))}
        </View>
      </MotionView>
    </>
  );
}

function GridView({
  currentDayNumber,
  monthKeys,
  readingDays,
  searchQuery,
  selectedDayNumber,
  startDate,
  visibleMonthKey,
  onChangeMonth,
  onClearSearch,
  onGoToCurrentDay,
  onOpenDay,
  onSearchChange,
  onSelectDay,
  onTogglePassage,
}: {
  currentDayNumber: number;
  monthKeys: string[];
  readingDays: ReadingPlanProgressDay[];
  searchQuery: string;
  selectedDayNumber: number;
  startDate: string;
  visibleMonthKey: string | null;
  onChangeMonth: (nextMonthKey: string) => void;
  onClearSearch: () => void;
  onGoToCurrentDay: () => void;
  onOpenDay: (day: ReadingPlanProgressDay) => void;
  onSearchChange: (query: string) => void;
  onSelectDay: (dayNumber: number) => void;
  onTogglePassage: (passage: ReadingPlanProgressPassage) => void;
}) {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const visibleMonthIndex = visibleMonthKey ? monthKeys.indexOf(visibleMonthKey) : 0;
  const safeMonthIndex = visibleMonthIndex >= 0 ? visibleMonthIndex : 0;
  const monthKey = monthKeys[safeMonthIndex] || visibleMonthKey;
  const normalizedQuery = normalizeSearch(searchQuery.trim());
  const isSearching = normalizedQuery.length > 0;
  const monthDays = useMemo(() => {
    return readingDays
      .filter((day) => getMonthKey(getDayDate(startDate, day.day_number)) === monthKey);
  }, [monthKey, readingDays, startDate]);
  const searchDays = useMemo(() => {
    if (!isSearching) return [];

    return readingDays.filter((day) => {
      const dayDate = formatDayMonth(getDayDate(startDate, day.day_number));
      const dayText = normalizeSearch(`jour ${day.day_number} ${dayDate}`);
      if (dayText.includes(normalizedQuery)) return true;

      return day.passages.some((passage) =>
        normalizeSearch(`${passage.reference} ${passage.description || ""}`).includes(normalizedQuery),
      );
    });
  }, [isSearching, normalizedQuery, readingDays, startDate]);
  const selectedDay = monthDays.find((day) => day.day_number === selectedDayNumber) || null;
  const calendarCells = useMemo(() => {
    if (!monthKey) return [];

    const [year, month] = monthKey.split("-").map(Number);
    if (!year || !month) return [];

    const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month, 0).getDate();
    const planDayByDate = new Map(
      monthDays.map((day) => [parseLocalDate(getDayDate(startDate, day.day_number)).getDate(), day]),
    );
    const cells: Array<{ dateNumber: number; day: ReadingPlanProgressDay | null } | null> = [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: totalDays }, (_, index) => ({
        dateNumber: index + 1,
        day: planDayByDate.get(index + 1) || null,
      })),
    ];

    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthDays, monthKey, startDate]);

  const canGoPrevious = safeMonthIndex > 0;
  const canGoNext = safeMonthIndex < monthKeys.length - 1;

  const selectSearchResult = (day: ReadingPlanProgressDay) => {
    onSelectDay(day.day_number);
    onChangeMonth(getMonthKey(getDayDate(startDate, day.day_number)));
    onClearSearch();
    setSearchExpanded(false);
  };

  const toggleSearch = () => {
    if (searchExpanded) onClearSearch();
    setSearchExpanded((current) => !current);
  };

  return (
    <>
      <MotionView delay={60} style={styles.calendarToolbar}>
        <PressableScale
          accessibilityLabel="Revenir au jour actuel"
          onPress={onGoToCurrentDay}
          pressedScale={0.96}
          style={styles.todayButton}
        >
          <CalendarDays size={15} color={COLORS.copper} />
          <Text style={styles.todayButtonText}>Aujourd’hui</Text>
        </PressableScale>
        <Pressable
          accessibilityLabel={searchExpanded ? "Fermer la recherche" : "Rechercher un passage"}
          accessibilityRole="button"
          onPress={toggleSearch}
          style={({ pressed }) => [styles.searchToggle, pressed && styles.iconButtonPressed]}
        >
          {searchExpanded ? <X size={18} color={COLORS.ink} /> : <Search size={18} color={COLORS.ink} />}
        </Pressable>
      </MotionView>

      {searchExpanded ? (
        <MotionView delay={40} style={styles.searchBox}>
          <Search size={17} color={COLORS.muted} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Rechercher un passage"
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
          {isSearching ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
              onPress={onClearSearch}
              style={styles.searchClearButton}
            >
              <X size={15} color={COLORS.muted} />
            </Pressable>
          ) : null}
        </MotionView>
      ) : null}

      {isSearching ? (
        <MotionView delay={60} style={styles.searchResults}>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>Résultats</Text>
            <Text style={styles.searchResultsCount}>{searchDays.length}</Text>
          </View>
          {searchDays.length ? searchDays.map((day) => (
            <Pressable
              key={day.day_number}
              accessibilityRole="button"
              onPress={() => selectSearchResult(day)}
              style={({ pressed }) => [styles.searchResultRow, pressed && styles.searchResultRowPressed]}
            >
              <View style={styles.searchResultDay}>
                <Text style={styles.searchResultDayNumber}>Jour {day.day_number}</Text>
                <Text style={styles.searchResultDate}>{formatDayMonth(getDayDate(startDate, day.day_number))}</Text>
              </View>
              <Text numberOfLines={2} style={styles.searchResultPassages}>
                {day.passages.map((passage) => passage.reference).join(" · ")}
              </Text>
              <ChevronRight size={17} color={COLORS.muted} />
            </Pressable>
          )) : (
            <View style={styles.searchEmptyInline}>
              <Text style={styles.searchEmptyTitle}>Aucun passage trouvé</Text>
              <Text style={styles.searchEmptyText}>Essayez un autre livre ou un numéro de jour.</Text>
            </View>
          )}
        </MotionView>
      ) : (
        <>
          <MotionView delay={100} style={styles.calendarCard}>
            <View style={styles.monthNav}>
          <Pressable
            disabled={!canGoPrevious}
            onPress={() => onChangeMonth(monthKeys[safeMonthIndex - 1])}
            style={({ pressed }) => [
              styles.monthArrowButton,
              !canGoPrevious && styles.monthButtonDisabled,
              pressed && canGoPrevious && styles.monthButtonPressed,
            ]}
            accessibilityLabel="Mois précédent"
          >
            <ChevronLeft size={20} color={COLORS.ink} />
          </Pressable>
          <Text maxFontSizeMultiplier={1.2} style={styles.monthTitle}>
            {formatMonthTitle(monthKey)}
          </Text>
          <Pressable
            disabled={!canGoNext}
            onPress={() => onChangeMonth(monthKeys[safeMonthIndex + 1])}
            style={({ pressed }) => [
              styles.monthArrowButton,
              !canGoNext && styles.monthButtonDisabled,
              pressed && canGoNext && styles.monthButtonPressed,
            ]}
            accessibilityLabel="Mois suivant"
          >
            <ChevronRight size={20} color={COLORS.ink} />
          </Pressable>
            </View>

            <View style={styles.weekdayRow}>
              {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.weekdayLabel}>{label}</Text>
              ))}
            </View>

            <View key={monthKey || "month"} style={styles.calendarGrid}>
              {calendarCells.map((cell, index) => {
                if (!cell) return <View key={`empty-${index}`} style={styles.calendarCell} />;

                const day = cell.day;
                const state = day ? getDayReadingState(day) : "pending";
                const isToday = day?.day_number === currentDayNumber;
                const isSelected = day?.day_number === selectedDayNumber;
                return (
                  <Pressable
                    key={`date-${cell.dateNumber}`}
                    accessibilityLabel={day ? `Sélectionner le jour ${day.day_number}` : undefined}
                    accessibilityRole={day ? "button" : undefined}
                    disabled={!day}
                    onPress={() => day && onSelectDay(day.day_number)}
                    style={({ pressed }) => [
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                      isToday && styles.calendarCellToday,
                      pressed && day && styles.calendarCellPressed,
                    ]}
                  >
                    <Text style={[
                      styles.calendarDateNumber,
                      !day && styles.calendarDateNumberOutsidePlan,
                      isSelected && styles.calendarDateNumberSelected,
                    ]}>
                      {cell.dateNumber}
                    </Text>
                    {day ? (
                      <View style={styles.calendarStateSlot}>
                        {state === "completed" ? (
                          <View style={styles.calendarStateCompleted}>
                            <Check size={10} color="#fff" />
                          </View>
                        ) : state === "in-progress" ? (
                          <View style={styles.calendarStateInProgress} />
                        ) : (
                          <View style={styles.calendarStatePending} />
                        )}
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </MotionView>

          {selectedDay ? (
            <CalendarDayDetail
              key={selectedDay.day_number}
              day={selectedDay}
              isToday={selectedDay.day_number === currentDayNumber}
              startDate={startDate}
              onOpenDay={() => onOpenDay(selectedDay)}
              onTogglePassage={onTogglePassage}
            />
          ) : (
            <MotionView delay={80} style={styles.calendarSelectionEmpty}>
              <Text style={styles.calendarSelectionEmptyTitle}>Choisissez une journée</Text>
              <Text style={styles.calendarSelectionEmptyText}>Ses passages apparaîtront ici.</Text>
            </MotionView>
          )}
        </>
      )}
    </>
  );
}

function PassageRow({
  checked,
  passage,
  onToggle,
}: {
  checked: boolean;
  passage: ReadingPlanProgressPassage;
  onToggle: () => void;
}) {
  return (
    <PressableScale onPress={onToggle} pressedScale={0.98} style={styles.passageRow}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Check size={14} color="#fff" /> : null}
      </View>
      <View style={styles.passageTextBlock}>
        <Text style={[styles.passageText, checked && styles.passageTextDone]}>{passage.reference}</Text>
        {!!passage.description && <Text style={styles.passageDescription}>{passage.description}</Text>}
      </View>
      <ChevronRight size={18} color={COLORS.muted} />
    </PressableScale>
  );
}

function CalendarDayDetail({
  day,
  isToday,
  startDate,
  onOpenDay,
  onTogglePassage,
}: {
  day: ReadingPlanProgressDay;
  isToday: boolean;
  startDate: string;
  onOpenDay: () => void;
  onTogglePassage: (passage: ReadingPlanProgressPassage) => void;
}) {
  const completedCount = day.passages.filter((passage) => passage.status === "completed").length;

  return (
    <MotionView delay={80} style={styles.calendarDetail}>
      <View style={styles.calendarDetailHandle} />
      <View style={styles.calendarDetailHeader}>
        <View style={styles.calendarDetailTitleBlock}>
          <Text style={styles.calendarDetailMeta}>
            Jour {day.day_number}{isToday ? " · Aujourd’hui" : ""}
          </Text>
          <Text style={styles.calendarDetailDate}>
            {formatLongDate(getDayDate(startDate, day.day_number))}
          </Text>
        </View>
        <Text style={styles.calendarDetailProgress}>{completedCount}/{day.passages.length}</Text>
      </View>

      <View style={styles.calendarPassages}>
        {day.passages.map((passage) => {
          const checked = passage.status === "completed";
          return (
            <Pressable
              key={passage.id}
              accessibilityLabel={`${checked ? "Marquer comme non lu" : "Marquer comme lu"} : ${passage.reference}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              onPress={() => onTogglePassage(passage)}
              style={({ pressed }) => [styles.calendarPassageRow, pressed && styles.calendarPassageRowPressed]}
            >
              <View style={[styles.calendarCheckbox, checked && styles.calendarCheckboxChecked]}>
                {checked ? <Check size={14} color="#fff" /> : null}
              </View>
              <View style={styles.calendarPassageTextBlock}>
                <Text style={[styles.calendarPassageReference, checked && styles.calendarPassageReferenceDone]}>
                  {passage.reference}
                </Text>
                {!!passage.description && (
                  <Text numberOfLines={1} style={styles.calendarPassageDescription}>
                    {passage.description}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityLabel={`Ouvrir le jour ${day.day_number} en vue focus`}
        accessibilityRole="button"
        onPress={onOpenDay}
        style={({ pressed }) => [styles.openReadingButton, pressed && styles.openReadingButtonPressed]}
      >
        <Text style={styles.openReadingButtonText}>Ouvrir la lecture</Text>
        <ChevronRight size={18} color={COLORS.copper} />
      </Pressable>
    </MotionView>
  );
}

function getDayProgress(day: ReadingPlanProgressDay) {
  if (!day.passages.length) return 0;
  const completed = day.passages.filter((passage) => passage.status === "completed").length;
  return Math.round((completed / day.passages.length) * 100);
}

function getDayReadingState(day: ReadingPlanProgressDay): DayReadingState {
  const progress = getDayProgress(day);

  if (progress >= 100) {
    return "completed";
  }

  if (progress > 0) {
    return "in-progress";
  }

  return "pending";
}

function getDayDate(startDate: string, dayNumber: number) {
  if (!startDate) return "";
  return getDateForDay(startDate, dayNumber);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function formatDayMonth(dateValue: string) {
  return format(parseLocalDate(dateValue), "d MMMM", { locale: fr });
}

function formatWeekdayShort(dateValue: string) {
  return format(parseLocalDate(dateValue), "EEE", { locale: fr }).replace(".", "");
}

function formatDayNumber(dateValue: string) {
  return format(parseLocalDate(dateValue), "d", { locale: fr });
}

function formatLongDate(dateValue: string) {
  return format(parseLocalDate(dateValue), "d MMMM yyyy", { locale: fr });
}

function getMonthKey(dateValue: string) {
  return format(parseLocalDate(dateValue), "yyyy-MM");
}

function getMonthKeys(days: ReadingPlanProgressDay[], startDate: string) {
  const keys = days.map((day) => getMonthKey(getDayDate(startDate, day.day_number)));
  return Array.from(new Set(keys));
}

function formatMonthTitle(monthKey: string | null) {
  if (!monthKey) return "";
  const [year, month] = monthKey.split("-").map(Number);
  return format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: fr }).replace(/^./, (letter) => letter.toUpperCase());
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 26,
    paddingBottom: 124,
  },
  tabletContent: {
    alignSelf: "center",
    maxWidth: 980,
    paddingBottom: 40,
    paddingHorizontal: 32,
    paddingTop: 32,
    width: "100%",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  viewSwitcher: {
    backgroundColor: "#efebe5",
    borderRadius: 17,
    flexDirection: "row",
    padding: 4,
  },
  switchButton: {
    alignItems: "center",
    borderRadius: 14,
    height: 31,
    justifyContent: "center",
    width: 34,
  },
  switchButtonActive: {
    backgroundColor: COLORS.copper,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 28,
  },
  loadingText: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  emptyTitle: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  emptyText: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  planSummary: {
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  planSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  planSummaryName: {
    color: COLORS.ink,
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    marginRight: 12,
  },
  planSummaryPercent: {
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  planSummaryProgressTrack: {
    backgroundColor: "#e9e0d8",
    borderRadius: 999,
    height: 4,
    marginTop: 10,
    overflow: "hidden",
  },
  planSummaryProgressFill: {
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: "100%",
  },
  dayRail: {
    gap: DAY_RAIL_ITEM_GAP,
    paddingBottom: 18,
    paddingRight: 18,
  },
  dayPill: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 70,
    paddingBottom: 12,
    paddingHorizontal: 4,
    paddingTop: 8,
    position: "relative",
    width: DAY_RAIL_ITEM_WIDTH,
  },
  dayPillInProgress: {
    backgroundColor: "transparent",
  },
  dayPillCompleted: {
    backgroundColor: "transparent",
  },
  dayPillActive: {
    backgroundColor: COLORS.chip,
  },
  dayPillPressed: {
    opacity: 0.62,
  },
  dayPillWeekday: {
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
    textTransform: "capitalize",
    width: "100%",
  },
  dayPillWeekdayActive: {
    color: COLORS.copper,
  },
  dayPillDateNumber: {
    color: COLORS.ink,
    fontFamily: fonts.medium,
    fontSize: 19,
    lineHeight: 24,
    marginTop: 2,
    textAlign: "center",
    width: "100%",
  },
  dayPillDateNumberActive: {
    color: COLORS.copper,
    fontFamily: fonts.semibold,
  },
  dayPillStateMarker: {
    backgroundColor: "#d8cec3",
    borderRadius: 999,
    bottom: 7,
    height: 6,
    position: "absolute",
    width: 6,
  },
  dayPillStateMarkerInProgress: {
    backgroundColor: "#d9ab65",
  },
  dayPillStateMarkerCompleted: {
    backgroundColor: COLORS.copper,
  },
  returnToCurrentDayRow: {
    alignItems: "flex-end",
    marginBottom: 12,
    marginTop: -6,
  },
  returnToCurrentDayButton: {
    alignItems: "center",
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  returnToCurrentDayText: {
    color: COLORS.copper,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  focusCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
  },
  focusCardHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  focusTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  focusDayLabel: {
    color: COLORS.copper,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  focusDate: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 23,
    lineHeight: 30,
    marginTop: 5,
    textTransform: "capitalize",
  },
  focusPassageCount: {
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    paddingBottom: 4,
  },
  focusPassages: {
    borderTopColor: COLORS.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
  },
  passageRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 72,
    paddingVertical: 14,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#cdbfb4",
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    marginRight: 14,
    width: 26,
  },
  checkboxChecked: {
    backgroundColor: COLORS.copper,
    borderColor: COLORS.copper,
  },
  passageTextBlock: {
    flex: 1,
  },
  passageText: {
    color: COLORS.ink,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  passageTextDone: {
    color: COLORS.muted,
  },
  passageDescription: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 16,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginLeft: 10,
    paddingVertical: 10,
  },
  searchClearButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    marginLeft: 6,
    width: 28,
  },
  calendarToolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  todayButton: {
    alignItems: "center",
    backgroundColor: COLORS.chip,
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 13,
  },
  todayButtonText: {
    color: COLORS.copper,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  searchToggle: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  iconButtonPressed: {
    backgroundColor: COLORS.chip,
  },
  searchResults: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  searchResultsHeader: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchResultsTitle: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  searchResultsCount: {
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  searchResultRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  searchResultRowPressed: {
    backgroundColor: COLORS.cardSoft,
  },
  searchResultDay: {
    width: 72,
  },
  searchResultDayNumber: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  searchResultDate: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 3,
  },
  searchResultPassages: {
    color: COLORS.ink,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  searchEmptyInline: {
    alignItems: "center",
    padding: 24,
  },
  searchEmptyTitle: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 16,
  },
  searchEmptyText: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center",
  },
  calendarCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  monthNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  monthArrowButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  monthButtonDisabled: {
    opacity: 0.22,
  },
  monthButtonPressed: {
    backgroundColor: COLORS.chip,
  },
  monthTitle: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 16,
    flex: 1,
    textAlign: "center",
    textTransform: "capitalize",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayLabel: {
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 11,
    textAlign: "center",
    width: "14.2857%",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarCell: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: 10,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: "14.2857%",
  },
  calendarCellSelected: {
    backgroundColor: COLORS.chip,
  },
  calendarCellToday: {
    borderColor: COLORS.copper,
  },
  calendarCellPressed: {
    backgroundColor: "#f1e6dc",
  },
  calendarDateNumber: {
    color: COLORS.ink,
    fontFamily: fonts.medium,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  calendarDateNumberOutsidePlan: {
    color: "#c9beb5",
  },
  calendarDateNumberSelected: {
    fontFamily: fonts.semibold,
  },
  calendarStateSlot: {
    alignItems: "center",
    height: 15,
    justifyContent: "center",
    marginTop: 3,
  },
  calendarStateCompleted: {
    alignItems: "center",
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: 15,
    justifyContent: "center",
    width: 15,
  },
  calendarStateInProgress: {
    backgroundColor: "#d7aa70",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  calendarStatePending: {
    borderColor: "#d8cec4",
    borderRadius: 999,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
  calendarDetail: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 10,
  },
  calendarDetailHandle: {
    alignSelf: "center",
    backgroundColor: "#ddd3ca",
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 34,
  },
  calendarDetailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calendarDetailTitleBlock: {
    flex: 1,
  },
  calendarDetailMeta: {
    color: COLORS.copper,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  calendarDetailDate: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 21,
    lineHeight: 28,
    marginTop: 5,
    textTransform: "capitalize",
  },
  calendarDetailProgress: {
    backgroundColor: COLORS.cardSoft,
    borderRadius: 999,
    color: COLORS.muted,
    fontFamily: fonts.medium,
    fontSize: 12,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  calendarPassages: {
    borderTopColor: COLORS.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calendarPassageRow: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 60,
    paddingVertical: 10,
  },
  calendarPassageRowPressed: {
    opacity: 0.62,
  },
  calendarCheckbox: {
    alignItems: "center",
    borderColor: "#cdbfb4",
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    marginRight: 13,
    width: 24,
  },
  calendarCheckboxChecked: {
    backgroundColor: COLORS.copper,
    borderColor: COLORS.copper,
  },
  calendarPassageTextBlock: {
    flex: 1,
  },
  calendarPassageReference: {
    color: COLORS.ink,
    fontFamily: fonts.medium,
    fontSize: 15,
  },
  calendarPassageReferenceDone: {
    color: COLORS.muted,
  },
  calendarPassageDescription: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 4,
  },
  openReadingButton: {
    alignItems: "center",
    borderColor: COLORS.copper,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
  },
  openReadingButtonPressed: {
    backgroundColor: COLORS.chip,
  },
  openReadingButtonText: {
    color: COLORS.copper,
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  calendarSelectionEmpty: {
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
  },
  calendarSelectionEmptyTitle: {
    color: COLORS.ink,
    fontFamily: fonts.semibold,
    fontSize: 15,
  },
  calendarSelectionEmptyText: {
    color: COLORS.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 5,
  },
});
