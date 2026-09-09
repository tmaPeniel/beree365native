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
  useWindowDimensions,
  View,
} from "react-native";
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

type ReadingViewMode = "focus" | "grid";
type DayReadingState = "pending" | "in-progress" | "completed";

const READING_VIEW_MODE_KEY = "reading-view-mode";
const DAY_RAIL_ITEM_WIDTH = 82;
const DAY_RAIL_ITEM_GAP = 7;

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
  const queryClient = useQueryClient();
  const { user, profile, triggerProgressUpdate } = useAuth();
  const { currentDayNumber, isLoading: dateLoading, planDuration } = useDateService();
  const { planName, planDescription } = usePlanDuration();
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

  const completeDay = useCallback(async (day: ReadingPlanProgressDay) => {
    if (!user?.id) return;

    const pendingPassages = day.passages.filter((passage) => passage.status !== "completed");
    if (!pendingPassages.length) return;

    await cancelReadingCaches();
    const previousProgress = queryClient.getQueryData<ReadingPlanProgressDay[]>(planQueryKey);
    pendingPassages.forEach((passage) => setChapterInCache(passage.id, "completed"));

    try {
      const results = await Promise.all(
        pendingPassages.map((passage) => toggleChapterStatus(user.id, passage.id, "pending")),
      );
      const failed = results.find((result) => !result.success);
      if (failed) {
        throw new Error(failed.error || "La journée n'a pas pu être enregistrée.");
      }
      await invalidateReadingCaches();
    } catch (error: any) {
      queryClient.setQueryData(planQueryKey, previousProgress);
      Alert.alert("Progression", error.message || "Impossible de cocher toute la journée.");
    }
  }, [cancelReadingCaches, invalidateReadingCaches, planQueryKey, queryClient, setChapterInCache, user?.id]);

  const isLoading = dateLoading || planQuery.isLoading;
  const currentVisibleMonthKey = visibleMonthKey || monthKeys[0] || null;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
            planDescription={planDescription}
            planDuration={planDuration}
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
            startDate={startDate}
            visibleMonthKey={currentVisibleMonthKey}
            onChangeMonth={setVisibleMonthKey}
            onClearSearch={() => setSearchQuery("")}
            onCompleteDay={completeDay}
            onGoToCurrentDay={goToCurrentDayInGrid}
            onOpenDay={openDayInFocus}
            onSearchChange={setSearchQuery}
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
  planDescription,
  planDuration,
  planName,
  readingDays,
  selectedDay,
  startDate,
  onSelectDay,
  onTogglePassage,
}: {
  currentDayNumber: number;
  globalProgress: number;
  planDescription?: string | null;
  planDuration: number;
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
  const dayProgress = getDayProgress(selectedDay);

  useEffect(() => {
    if (selectedIndex < 0) return;

    requestAnimationFrame(() => {
      railRef.current?.scrollToIndex({
        animated: false,
        index: selectedIndex,
        viewPosition: 0.5,
      });
    });
  }, [selectedIndex]);

  return (
    <>
      <MotionView delay={70} style={styles.hero}>
        <Text style={styles.heroSmall}>{planDescription || "Plan biblique"}</Text>
        <Text style={styles.heroTitle}>{planName || "Plan de lecture"}</Text>
        <View style={styles.heroProgressRow}>
          <Text style={styles.heroProgressLabel}>Progression globale</Text>
          <Text style={styles.heroProgressLabel}>{globalProgress}%</Text>
        </View>
        <AnimatedProgressBar
          fillStyle={styles.heroProgressFill}
          minPercent={4}
          progress={globalProgress}
          style={styles.heroTrack}
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
          return (
            <PressableScale
              onPress={() => onSelectDay(item.day_number)}
              pressedScale={0.94}
              style={[
                styles.dayPill,
                readingState === "in-progress" && styles.dayPillInProgress,
                readingState === "completed" && styles.dayPillCompleted,
                active && styles.dayPillActive,
              ]}
            >
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={[styles.dayPillNumber, active && styles.dayPillNumberActive]}
              >
                {item.day_number}
              </Text>
              <Text
                allowFontScaling={false}
                maxFontSizeMultiplier={1}
                numberOfLines={1}
                style={[styles.dayPillDate, active && styles.dayPillDateActive]}
              >
                {formatDayMonth(getDayDate(startDate, item.day_number))}
              </Text>
              {isToday ? <View style={styles.todayDot} /> : null}
              <View
                style={[
                  styles.dayPillStateMarker,
                  readingState === "in-progress" && styles.dayPillStateMarkerInProgress,
                  readingState === "completed" && styles.dayPillStateMarkerCompleted,
                ]}
              />
            </PressableScale>
          );
        }}
      />
      </MotionView>

      <MotionView key={`focus-day-${selectedDay.day_number}`} delay={90} style={styles.focusCard}>
        <View style={styles.focusCardHeader}>
          <View>
            <Text style={styles.focusTitle}>
              Jour {selectedDay.day_number} <Text style={styles.focusTitleMuted}>sur {planDuration}</Text>
            </Text>
            <Text style={styles.focusDate}>{formatLongDate(getDayDate(startDate, selectedDay.day_number))}</Text>
          </View>
          <Text style={styles.focusPercent}>{dayProgress}%</Text>
        </View>

        <AnimatedProgressBar
          fillStyle={styles.focusProgressFill}
          progress={dayProgress}
          style={styles.focusProgressTrack}
        />

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
  startDate,
  visibleMonthKey,
  onChangeMonth,
  onClearSearch,
  onCompleteDay,
  onGoToCurrentDay,
  onOpenDay,
  onSearchChange,
  onTogglePassage,
}: {
  currentDayNumber: number;
  monthKeys: string[];
  readingDays: ReadingPlanProgressDay[];
  searchQuery: string;
  startDate: string;
  visibleMonthKey: string | null;
  onChangeMonth: (nextMonthKey: string) => void;
  onClearSearch: () => void;
  onCompleteDay: (day: ReadingPlanProgressDay) => void;
  onGoToCurrentDay: () => void;
  onOpenDay: (day: ReadingPlanProgressDay) => void;
  onSearchChange: (query: string) => void;
  onTogglePassage: (passage: ReadingPlanProgressPassage) => void;
}) {
  const { width } = useWindowDimensions();
  const visibleMonthIndex = visibleMonthKey ? monthKeys.indexOf(visibleMonthKey) : 0;
  const safeMonthIndex = visibleMonthIndex >= 0 ? visibleMonthIndex : 0;
  const monthKey = monthKeys[safeMonthIndex] || visibleMonthKey;
  const normalizedQuery = normalizeSearch(searchQuery.trim());
  const isSearching = normalizedQuery.length > 0;
  const cardGap = 10;
  const cardWidth = Math.max(132, Math.floor((width - 36 - cardGap) / 2));
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
  const visibleDays = isSearching ? searchDays : monthDays;
  const displayedCurrentDay =
    Number.isFinite(currentDayNumber) && currentDayNumber > 0
      ? Math.round(currentDayNumber)
      : 1;

  const canGoPrevious = safeMonthIndex > 0;
  const canGoNext = safeMonthIndex < monthKeys.length - 1;

  return (
    <>
      <MotionView delay={60} style={styles.searchBox}>
        <Search size={17} color={COLORS.muted} />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Rechercher des passages (ex: Jean, Psaume)"
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

      <PressableScale onPress={onGoToCurrentDay} pressedScale={0.96} style={styles.currentDayChip}>
        <CalendarDays size={14} color={COLORS.copper} />
        <Text maxFontSizeMultiplier={1.15} style={styles.currentDayChipText}>Jour actuel</Text>
        <View style={styles.currentDayNumberBadge}>
          <Text maxFontSizeMultiplier={1.15} style={styles.currentDayNumberText}>
            {displayedCurrentDay}
          </Text>
        </View>
      </PressableScale>

      {isSearching ? (
        <MotionView delay={130} style={styles.searchSummary}>
          <Text style={styles.searchSummaryTitle}>Resultats dans tout le plan</Text>
          <Text style={styles.searchSummaryText}>
            {searchDays.length} jour{searchDays.length > 1 ? "s" : ""} trouve{searchDays.length > 1 ? "s" : ""}
          </Text>
        </MotionView>
      ) : (
      <MotionView delay={160} style={styles.monthNav}>
        <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={styles.monthTitle}>
          {formatMonthTitle(monthKey)}
        </Text>
        <View style={styles.monthControls}>
          <Pressable
            disabled={!canGoPrevious}
            onPress={() => onChangeMonth(monthKeys[safeMonthIndex - 1])}
            style={({ pressed }) => [
              styles.monthButton,
              !canGoPrevious && styles.monthButtonDisabled,
              pressed && canGoPrevious && styles.monthButtonPressed,
            ]}
          >
            <ChevronLeft size={16} color={COLORS.ink} />
            <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={styles.monthButtonText}>
              Précédent
            </Text>
          </Pressable>
          <Pressable
            disabled={!canGoNext}
            onPress={() => onChangeMonth(monthKeys[safeMonthIndex + 1])}
            style={({ pressed }) => [
              styles.monthButton,
              !canGoNext && styles.monthButtonDisabled,
              pressed && canGoNext && styles.monthButtonPressed,
            ]}
          >
            <Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={styles.monthButtonText}>
              Suivant
            </Text>
            <ChevronRight size={16} color={COLORS.ink} />
          </Pressable>
        </View>
      </MotionView>
      )}

      <MotionView key={monthKey || "month"} delay={80} style={styles.grid}>
        {visibleDays.map((day, index) => (
          <DayCard
            key={day.day_number}
            animationDelay={index * 38}
            cardWidth={cardWidth}
            day={day}
            isToday={day.day_number === currentDayNumber}
            onCompleteDay={() => onCompleteDay(day)}
            onOpenDay={() => onOpenDay(day)}
            onTogglePassage={onTogglePassage}
          />
        ))}
      </MotionView>
      {isSearching && !searchDays.length ? (
        <MotionView delay={120} style={styles.searchEmpty}>
          <Text style={styles.searchEmptyTitle}>Aucun passage trouve</Text>
          <Text style={styles.searchEmptyText}>Essayez un autre livre, un numero de jour ou effacez la recherche.</Text>
          <PressableScale onPress={onClearSearch} pressedScale={0.96} style={styles.searchEmptyButton}>
            <X size={14} color={COLORS.ink} />
            <Text style={styles.searchEmptyButtonText}>Effacer</Text>
          </PressableScale>
        </MotionView>
      ) : null}
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

function DayCard({
  animationDelay,
  cardWidth,
  day,
  isToday,
  onCompleteDay,
  onOpenDay,
  onTogglePassage,
}: {
  animationDelay: number;
  cardWidth: number;
  day: ReadingPlanProgressDay;
  isToday: boolean;
  onCompleteDay: () => void;
  onOpenDay: () => void;
  onTogglePassage: (passage: ReadingPlanProgressPassage) => void;
}) {
  const progress = getDayProgress(day);
  const completedCount = day.passages.filter((passage) => passage.status === "completed").length;
  const totalPassages = day.passages.length;
  const readingState = getDayReadingState(day);
  const isCompleted = readingState === "completed";

  return (
    <MotionView delay={animationDelay} style={{ width: cardWidth }}>
      <Pressable
        accessibilityHint="Affiche les passages détaillés de ce jour"
        accessibilityLabel={`Ouvrir le jour ${day.day_number} en mode focus`}
        accessibilityRole="button"
        onPress={onOpenDay}
        style={({ pressed }) => [
          styles.dayCard,
          readingState === "in-progress" && styles.dayCardInProgress,
          isCompleted && styles.dayCardDone,
          isToday && styles.dayCardToday,
          pressed && styles.dayCardPressed,
        ]}
      >
      <View style={styles.dayCardHeader}>
        <View style={styles.dayCardTitleBlock}>
          <Text style={styles.dayCardTitle}>Jour {day.day_number}</Text>
        </View>
        <View
          style={[
            styles.dayStateBadge,
            readingState === "in-progress" && styles.dayStateBadgeInProgress,
            isCompleted && styles.dayStateBadgeDone,
            isToday && styles.dayStateBadgeToday,
          ]}
        >
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            style={[
              styles.dayStateBadgeText,
              isCompleted && styles.dayStateBadgeTextDone,
              isToday && styles.dayStateBadgeTextToday,
            ]}
          >
            {isToday ? "Aujourd'hui" : getDayStateLabel(readingState)}
          </Text>
        </View>
      </View>
      <View style={styles.dayCardProgressHeader}>
        <Text style={styles.dayCardProgressText}>
          {completedCount}/{totalPassages} passages
        </Text>
        <Text style={styles.dayCardProgress}>{progress}%</Text>
      </View>
      <AnimatedProgressBar
        fillStyle={[
          styles.dayCardProgressFill,
          readingState === "in-progress" && styles.dayCardProgressFillActive,
          isCompleted && styles.dayCardProgressFillDone,
        ]}
        minPercent={progress > 0 ? 4 : 0}
        progress={progress}
        style={styles.dayCardProgressTrack}
      />
      <Text style={styles.dayCardSection}>Passages du jour</Text>
      {day.passages.map((passage) => (
        <Pressable
          key={passage.id}
          onPress={(event) => {
            event.stopPropagation();
            onTogglePassage(passage);
          }}
          style={styles.dayCardPassageRow}
        >
          <View style={[styles.gridCheckbox, passage.status === "completed" && styles.gridCheckboxChecked]}>
            {passage.status === "completed" ? <Check size={10} color="#fff" /> : null}
          </View>
          <View style={styles.dayCardPassageTextBlock}>
            <Text
              style={[styles.dayCardPassageText, passage.status === "completed" && styles.dayCardPassageDone]}
            >
              {passage.reference}
            </Text>
            {!!passage.description && (
              <Text style={styles.dayCardPassageDescription}>
                {passage.description}
              </Text>
            )}
          </View>
        </Pressable>
      ))}

      <View style={styles.dayCardFooter}>
        <Pressable
          disabled={isCompleted}
          onPress={(event) => {
            event.stopPropagation();
            onCompleteDay();
          }}
          style={({ pressed }) => [
            styles.completeButton,
            isCompleted && styles.completeButtonDone,
            pressed && !isCompleted && styles.completeButtonPressed,
          ]}
        >
          <Check size={14} color={isCompleted ? "#fff" : COLORS.ink} />
          <Text
            maxFontSizeMultiplier={1.15}
            numberOfLines={1}
            style={[styles.completeButtonText, isCompleted && styles.completeButtonTextDone]}
          >
            {isCompleted ? "Terminé" : "Tout cocher"}
          </Text>
        </Pressable>
      </View>
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

function getDayStateLabel(state: DayReadingState) {
  if (state === "completed") return "Terminé";
  if (state === "in-progress") return "En cours";
  return "À lire";
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
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
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
    fontSize: 14,
  },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  hero: {
    backgroundColor: "#44230e",
    borderRadius: 12,
    marginBottom: 14,
    minHeight: 178,
    overflow: "hidden",
    padding: 22,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  heroSmall: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 44,
    textAlign: "center",
  },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 8,
  },
  heroProgressRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  heroProgressLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  heroTrack: {
    backgroundColor: "rgba(255,255,255,0.38)",
    borderRadius: 999,
    height: 7,
    marginTop: 8,
    overflow: "hidden",
  },
  heroProgressFill: {
    backgroundColor: "#fff",
    borderRadius: 999,
    height: "100%",
  },
  dayRail: {
    gap: 7,
    paddingBottom: 20,
    paddingRight: 18,
  },
  dayPill: {
    alignItems: "center",
    backgroundColor: "#f2eee9",
    borderColor: "#ebe2d8",
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 8,
    paddingBottom: 9,
    position: "relative",
    width: DAY_RAIL_ITEM_WIDTH,
  },
  dayPillInProgress: {
    backgroundColor: "#fbf2df",
    borderColor: "#ead6ad",
  },
  dayPillCompleted: {
    backgroundColor: "#eee1d5",
    borderColor: "#c89461",
  },
  dayPillActive: {
    backgroundColor: COLORS.copperDark,
    borderColor: COLORS.copperDark,
  },
  dayPillNumber: {
    color: COLORS.ink,
    flexShrink: 0,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 20,
    minWidth: DAY_RAIL_ITEM_WIDTH - 16,
    textAlign: "center",
    width: DAY_RAIL_ITEM_WIDTH - 16,
  },
  dayPillNumberActive: {
    color: "#fff",
  },
  dayPillDate: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 12,
    marginTop: 3,
    maxWidth: DAY_RAIL_ITEM_WIDTH - 8,
    textAlign: "center",
    textTransform: "lowercase",
    width: DAY_RAIL_ITEM_WIDTH - 8,
  },
  dayPillDateActive: {
    color: "rgba(255,255,255,0.82)",
  },
  dayPillStateMarker: {
    backgroundColor: "#d8cec3",
    borderRadius: 999,
    bottom: 4,
    height: 3,
    position: "absolute",
    width: 24,
  },
  dayPillStateMarkerInProgress: {
    backgroundColor: "#d9ab65",
  },
  dayPillStateMarkerCompleted: {
    backgroundColor: COLORS.copper,
  },
  todayDot: {
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: 5,
    marginTop: 5,
    width: 5,
  },
  focusCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
  },
  focusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  focusTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  focusTitleMuted: {
    color: COLORS.muted,
    fontWeight: "400",
  },
  focusDate: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 12,
    textTransform: "capitalize",
  },
  focusPercent: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  focusPassages: {
    gap: 11,
    marginTop: 16,
  },
  focusProgressTrack: {
    backgroundColor: "#f0e7df",
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  focusProgressFill: {
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    height: "100%",
  },
  passageRow: {
    alignItems: "center",
    backgroundColor: COLORS.cardSoft,
    borderRadius: 11,
    flexDirection: "row",
    minHeight: 44,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    marginRight: 12,
    width: 22,
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
    fontSize: 14,
    fontWeight: "700",
  },
  passageTextDone: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },
  passageDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 3,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 14,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  searchInput: {
    color: COLORS.ink,
    flex: 1,
    fontSize: 13,
    marginLeft: 10,
    paddingVertical: 8,
  },
  searchClearButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 28,
    justifyContent: "center",
    marginLeft: 6,
    width: 28,
  },
  currentDayChip: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: COLORS.chip,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  currentDayChipText: {
    color: COLORS.copper,
    fontSize: 13,
    fontWeight: "800",
  },
  currentDayNumberBadge: {
    alignItems: "center",
    backgroundColor: COLORS.copper,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 24,
    minWidth: 30,
    paddingHorizontal: 7,
  },
  currentDayNumberText: {
    color: "#fff",
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  searchSummary: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchSummaryTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  searchSummaryText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  searchEmpty: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 18,
  },
  searchEmptyTitle: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  searchEmptyText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center",
  },
  searchEmptyButton: {
    alignItems: "center",
    backgroundColor: COLORS.chip,
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchEmptyButtonText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  monthNav: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    gap: 12,
    marginBottom: 20,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  monthControls: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  monthButton: {
    alignItems: "center",
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10,
  },
  monthButtonDisabled: {
    opacity: 0.35,
  },
  monthButtonPressed: {
    backgroundColor: COLORS.chip,
  },
  monthButtonText: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  monthTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dayCard: {
    backgroundColor: "#fff",
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 272,
    padding: 12,
    width: "100%",
  },
  dayCardPressed: {
    opacity: 0.72,
  },
  dayCardInProgress: {
    backgroundColor: "#fffaf3",
    borderColor: "#d9ab65",
  },
  dayCardDone: {
    backgroundColor: "#fffdfb",
    borderColor: COLORS.copper,
  },
  dayCardToday: {
    borderColor: COLORS.copperDark,
    borderWidth: 1.5,
  },
  dayCardHeader: {
    alignItems: "flex-start",
    gap: 7,
  },
  dayCardTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  dayCardTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  dayStateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f4eee8",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  dayStateBadgeInProgress: {
    backgroundColor: "#f3dfbc",
  },
  dayStateBadgeDone: {
    backgroundColor: COLORS.copper,
  },
  dayStateBadgeToday: {
    backgroundColor: COLORS.copperDark,
  },
  dayStateBadgeText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  dayStateBadgeTextDone: {
    color: "#fff",
  },
  dayStateBadgeTextToday: {
    color: "#fff",
  },
  dayCardProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  dayCardProgressText: {
    color: COLORS.muted,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
  },
  dayCardProgressTrack: {
    backgroundColor: "#f0e7df",
    borderRadius: 999,
    height: 6,
    marginBottom: 12,
    marginTop: 6,
    overflow: "hidden",
  },
  dayCardProgressFill: {
    backgroundColor: "#d8cec3",
    borderRadius: 999,
    height: "100%",
  },
  dayCardProgressFillActive: {
    backgroundColor: "#d9ab65",
  },
  dayCardProgressFillDone: {
    backgroundColor: COLORS.copper,
  },
  dayCardSection: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8,
  },
  dayCardPassageRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    marginBottom: 8,
  },
  gridCheckbox: {
    alignItems: "center",
    borderColor: "#e4c6ac",
    borderRadius: 3,
    borderWidth: 1,
    height: 12,
    justifyContent: "center",
    marginRight: 7,
    marginTop: 2,
    width: 12,
  },
  gridCheckboxChecked: {
    backgroundColor: COLORS.copper,
    borderColor: COLORS.copper,
  },
  dayCardPassageText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
  },
  dayCardPassageTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  dayCardPassageDescription: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
  },
  dayCardPassageDone: {
    color: COLORS.muted,
    textDecorationLine: "line-through",
  },
  dayCardFooter: {
    marginTop: "auto",
  },
  completeButton: {
    alignItems: "center",
    backgroundColor: "#faf6f1",
    borderColor: COLORS.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: "100%",
  },
  completeButtonDone: {
    backgroundColor: COLORS.copper,
    borderColor: COLORS.copper,
  },
  completeButtonPressed: {
    backgroundColor: COLORS.chip,
  },
  completeButtonText: {
    color: COLORS.ink,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800",
  },
  completeButtonTextDone: {
    color: "#fff",
  },
  dayCardProgress: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "800",
  },
});
