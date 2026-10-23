import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import * as ImagePicker from "expo-image-picker";
import { router, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  ChevronLeft,
  CalendarClock,
  ChevronRight,
  Crown,
  Flag,
  Flame,
  Gift,
  Image as ImageIcon,
  Info,
  Lock,
  Mail,
  Moon,
  RotateCcw,
  Shield,
  Sparkles,
  Sunrise,
  Target,
  Trash2,
  UserX,
} from "lucide-react-native";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  deleteCurrentUserAccount,
  redeemPremiumCode,
  updatePlanStartDate,
  updateUserProfile,
} from "@/features/auth/services/auth";
import { getProfileInitials, ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { removeProfileAvatar, uploadProfileAvatar } from "@/features/profile/services/avatar-service";
import { clearCurrentUserReadingData } from "@/features/profile/services/data-management-service";
import { exportCurrentUserData } from "@/features/profile/services/privacy-export-service";
import {
  Badge,
  getAllBadges,
  getBadgeProgress,
  getUserBadges,
  UserBadge,
} from "@/features/profile/services/badgeService";
import { usePremium } from "@/features/profile/hooks/usePremium";
import { useNotificationPreferences } from "@/features/profile/hooks/useNotificationPreferences";
import { usePrivacyConsents } from "@/features/profile/hooks/usePrivacyConsents";
import {
  getOverallProgress,
  getUserReadingPlanProgress,
} from "@/features/reading/services/readingPlan";
import { getUserPlan } from "@/features/reading/services/readingPlan/planService";
import { MotionView, PressableScale } from "@/shared/animation/Motion";
import { colors, fonts, styles } from "@/shared/theme/styles";

type StatisticsPeriod = "week" | "month" | "year";
type ChartBucket = {
  activeDays: number;
  end: Date;
  key: string;
  label: string;
  start: Date;
  value: number;
};
type BadgeGridItem = { badge: Badge; unlocked?: UserBadge; progress?: number; required?: number; current?: number };
type IconType = typeof Bell;

const timeOptions = ["07:00", "08:00", "12:00", "19:00", "21:00"];

function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const isProfileDetail = pathname.startsWith("/profile/");
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/profile");
  };

  return (
    <MotionView style={[s.header, isProfileDetail && { paddingTop: insets.top + 8 }]}>
      {isProfileDetail ? (
        <View style={s.detailHeaderRow}>
          <PressableScale
            accessibilityLabel="Retour"
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            pressedScale={0.94}
            style={({ pressed }) => [s.backButton, pressed && s.backButtonPressed]}
          >
            <ChevronLeft color={colors.text} size={22} strokeWidth={2} />
          </PressableScale>
          <View style={s.detailHeaderCopy}>
            <Text numberOfLines={1} style={styles.heading}>{title}</Text>
            {!!subtitle && <Text numberOfLines={2} style={styles.subheading}>{subtitle}</Text>}
          </View>
        </View>
      ) : (
        <>
          <Text style={styles.heading}>{title}</Text>
          {!!subtitle && <Text style={styles.subheading}>{subtitle}</Text>}
        </>
      )}
    </MotionView>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} pressedScale={0.95} style={[s.chip, active && s.activeChip]}>
      <Text style={[s.chipText, active && s.activeChipText]}>{label}</Text>
    </PressableScale>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Non defini";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function diffDays(a: string, b: string) {
  return Math.round((new Date(`${a}T00:00:00.000Z`).getTime() - new Date(`${b}T00:00:00.000Z`).getTime()) / 86400000);
}

function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function computeActivity(days: Awaited<ReturnType<typeof getUserReadingPlanProgress>>) {
  const counts = new Map<string, number>();
  let chaptersRead = 0;
  days.forEach((day) => {
    day.passages.forEach((passage) => {
      if (passage.status === "completed" && passage.completed_at) {
        chaptersRead += 1;
        const key = dateKey(new Date(passage.completed_at));
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
  });
  const dates = Array.from(counts.keys()).sort();
  let maxStreak = 0;
  let run = 0;
  let previous: string | null = null;
  dates.forEach((key) => {
    run = previous && diffDays(key, previous) === 1 ? run + 1 : 1;
    maxStreak = Math.max(maxStreak, run);
    previous = key;
  });
  let currentStreak = 0;
  if (dates.length) {
    currentStreak = 1;
    for (let index = dates.length - 1; index > 0; index -= 1) {
      if (diffDays(dates[index], dates[index - 1]) === 1) currentStreak += 1;
      else break;
    }
    if (diffDays(dateKey(new Date()), dates[dates.length - 1]) > 1) currentStreak = 0;
  }
  return { activeDays: dates.length, chaptersRead, counts, currentStreak, maxStreak };
}

function minDate(left: Date, right: Date) {
  return isBefore(left, right) ? left : right;
}

function maxDate(left: Date, right: Date) {
  return isAfter(left, right) ? left : right;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWeekRange(start: Date) {
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const sameMonth = format(start, "yyyy-MM") === format(end, "yyyy-MM");
  const sameYear = format(start, "yyyy") === format(end, "yyyy");
  if (sameMonth) return `${format(start, "d")}–${format(end, "d MMMM yyyy", { locale: fr })}`;
  if (sameYear) return `${format(start, "d MMMM", { locale: fr })}–${format(end, "d MMMM yyyy", { locale: fr })}`;
  return `${format(start, "d MMMM yyyy", { locale: fr })}–${format(end, "d MMMM yyyy", { locale: fr })}`;
}

function countRange(counts: Map<string, number>, start: Date, end: Date) {
  let value = 0;
  let activeDays = 0;
  for (let cursor = startOfDay(start); !isAfter(cursor, end); cursor = addDays(cursor, 1)) {
    const dayValue = counts.get(dateKey(cursor)) || 0;
    value += dayValue;
    if (dayValue > 0) activeDays += 1;
  }
  return { activeDays, value };
}

function buildWeekBuckets(counts: Map<string, number>, anchor: Date, planStart: Date, today: Date): ChartBucket[] {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const available = !isBefore(day, planStart) && !isAfter(day, today);
    const value = available ? counts.get(dateKey(day)) || 0 : 0;
    return {
      activeDays: value > 0 ? 1 : 0,
      end: day,
      key: dateKey(day),
      label: capitalize(format(day, "EEE d", { locale: fr }).replace(".", "")),
      start: day,
      value,
    };
  });
}

function buildMonthBuckets(counts: Map<string, number>, anchor: Date, planStart: Date, today: Date): ChartBucket[] {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const buckets: ChartBucket[] = [];

  for (let cursor = monthStart; !isAfter(cursor, monthEnd);) {
    const calendarEnd = minDate(endOfWeek(cursor, { weekStartsOn: 1 }), monthEnd);
    const visibleStart = maxDate(cursor, planStart);
    const visibleEnd = minDate(calendarEnd, today);
    if (!isAfter(cursor, today) && !isBefore(calendarEnd, planStart)) {
      const totals = countRange(counts, visibleStart, visibleEnd);
      buckets.push({
        ...totals,
        end: calendarEnd,
        key: `${dateKey(cursor)}_${dateKey(calendarEnd)}`,
        label: `${format(cursor, "d")}–${format(calendarEnd, "d")}`,
        start: cursor,
      });
    }
    cursor = addDays(calendarEnd, 1);
  }

  return buckets;
}

function buildYearBuckets(counts: Map<string, number>, planStart: Date, today: Date): ChartBucket[] {
  const buckets: ChartBucket[] = [];
  for (let cursor = startOfMonth(planStart); !isAfter(cursor, startOfMonth(today)); cursor = addMonths(cursor, 1)) {
    const rangeStart = maxDate(cursor, planStart);
    const rangeEnd = minDate(endOfMonth(cursor), today);
    const totals = countRange(counts, rangeStart, rangeEnd);
    buckets.push({
      ...totals,
      end: endOfMonth(cursor),
      key: format(cursor, "yyyy-MM"),
      label: capitalize(format(cursor, "MMM", { locale: fr }).replace(".", "")),
      start: cursor,
    });
  }
  return buckets;
}

function PeriodTabs({ period, onChange }: { period: StatisticsPeriod; onChange: (period: StatisticsPeriod) => void }) {
  const tabs: { key: StatisticsPeriod; label: string }[] = [
    { key: "week", label: "Semaine" },
    { key: "month", label: "Mois" },
    { key: "year", label: "Année" },
  ];
  return (
    <View accessibilityRole="tablist" style={s.statsTabs}>
      {tabs.map((tab) => {
        const active = tab.key === period;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [s.statsTab, active && s.statsTabActive, pressed && s.statsTabPressed]}
          >
            <Text style={[s.statsTabText, active && s.statsTabTextActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PeriodNavigation({
  canGoNext,
  canGoPrevious,
  label,
  onNext,
  onPrevious,
}: {
  canGoNext: boolean;
  canGoPrevious: boolean;
  label: string;
  onNext: () => void;
  onPrevious: () => void;
}) {
  return (
    <View style={s.periodNavigation}>
      <PressableScale
        accessibilityLabel="Période précédente"
        accessibilityRole="button"
        disabled={!canGoPrevious}
        onPress={onPrevious}
        pressedScale={0.9}
        style={[s.periodArrow, !canGoPrevious && s.periodArrowDisabled]}
      >
        <ChevronLeft color={colors.primary} size={22} strokeWidth={1.8} />
      </PressableScale>
      <Text numberOfLines={1} style={s.periodTitle}>{label}</Text>
      <PressableScale
        accessibilityLabel="Période suivante"
        accessibilityRole="button"
        disabled={!canGoNext}
        onPress={onNext}
        pressedScale={0.9}
        style={[s.periodArrow, !canGoNext && s.periodArrowDisabled]}
      >
        <ChevronRight color={colors.primary} size={22} strokeWidth={1.8} />
      </PressableScale>
    </View>
  );
}

function ActivityBars({
  buckets,
  selectedKey,
  onSelect,
  today,
}: {
  buckets: ChartBucket[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  today: Date;
}) {
  const max = Math.max(...buckets.map((bucket) => bucket.value), 1);
  return (
    <View style={s.activityChart}>
      <View pointerEvents="none" style={s.chartGuides}>
        <View style={s.chartGuide} />
        <View style={s.chartGuide} />
        <View style={s.chartGuide} />
      </View>
      <View style={s.chartColumns}>
        {buckets.map((bucket) => {
          const selected = bucket.key === selectedKey;
          const unavailable = isAfter(bucket.start, today);
          const barHeight: `${number}%` | number = bucket.value > 0
            ? `${Math.max((bucket.value / max) * 100, 7)}%`
            : 3;
          return (
            <Pressable
              accessibilityLabel={`${bucket.label}, ${bucket.value} passages lus`}
              accessibilityRole="button"
              accessibilityState={{ disabled: unavailable, selected }}
              disabled={unavailable}
              key={bucket.key}
              onPress={() => onSelect(bucket.key)}
              style={({ pressed }) => [s.chartColumn, selected && s.chartColumnSelected, pressed && s.chartColumnPressed]}
            >
              <View style={s.chartBarArea}>
                <View style={[s.chartBar, { height: barHeight }, unavailable && s.chartBarUnavailable]} />
              </View>
              <Text numberOfLines={2} style={[s.chartLabel, selected && s.chartLabelSelected]}>{bucket.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function StatisticsScreen() {
  const { profile, user } = useAuth();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [period, setPeriod] = useState<StatisticsPeriod>("week");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(today));
  const [selectedBucketKey, setSelectedBucketKey] = useState<string | null>(null);
  const progressQuery = useQuery({ queryKey: ["mobile-stats", user?.id], queryFn: () => getOverallProgress(user.id), enabled: !!user?.id });
  const planQuery = useQuery({ queryKey: ["mobile-current-plan", user?.id], queryFn: () => getUserPlan(user.id), enabled: !!user?.id });
  const activityQuery = useQuery({ queryKey: ["mobile-profile-activity", user?.id], queryFn: () => getUserReadingPlanProgress(user.id), enabled: !!user?.id });
  const activity = useMemo(() => computeActivity(activityQuery.data || []), [activityQuery.data]);
  const planStart = useMemo(() => {
    const parsed = profile?.start_date ? startOfDay(parseISO(profile.start_date)) : today;
    if (!isValid(parsed)) return today;
    return isAfter(parsed, today) ? today : parsed;
  }, [profile?.start_date, today]);
  const planWeekStart = useMemo(() => startOfWeek(planStart, { weekStartsOn: 1 }), [planStart]);
  const planMonthStart = useMemo(() => startOfMonth(planStart), [planStart]);
  const currentWeekStart = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const currentMonthStart = useMemo(() => startOfMonth(today), [today]);
  const buckets = useMemo(() => {
    if (period === "week") return buildWeekBuckets(activity.counts, weekAnchor, planStart, today);
    if (period === "month") return buildMonthBuckets(activity.counts, monthAnchor, planStart, today);
    return buildYearBuckets(activity.counts, planStart, today);
  }, [activity.counts, monthAnchor, period, planStart, today, weekAnchor]);

  useEffect(() => {
    if (!buckets.some((bucket) => bucket.key === selectedBucketKey)) {
      const defaultBucket = [...buckets].reverse().find((bucket) => !isAfter(bucket.start, today));
      setSelectedBucketKey(defaultBucket?.key ?? null);
    }
  }, [buckets, selectedBucketKey, today]);

  const selectedBucket = buckets.find((bucket) => bucket.key === selectedBucketKey) ?? buckets[buckets.length - 1];
  const completedDays = progressQuery.data?.completedDays ?? 0;
  const totalDays = planQuery.data?.duration_days ?? 365;
  const progressPercentage = totalDays > 0 ? Math.min(Math.round((completedDays / totalDays) * 100), 100) : 0;
  const canGoPrevious = period === "week"
    ? isAfter(weekAnchor, planWeekStart)
    : period === "month" && isAfter(monthAnchor, planMonthStart);
  const canGoNext = period === "week"
    ? isBefore(weekAnchor, currentWeekStart)
    : period === "month" && isBefore(monthAnchor, currentMonthStart);
  const periodLabel = period === "week"
    ? formatWeekRange(weekAnchor)
    : capitalize(format(monthAnchor, "MMMM yyyy", { locale: fr }));
  const detailLabel = selectedBucket
    ? period === "week"
      ? capitalize(format(selectedBucket.start, "EEEE d MMMM", { locale: fr }))
      : period === "month"
        ? `${format(selectedBucket.start, "d")}–${format(selectedBucket.end, "d MMMM", { locale: fr })}`
        : capitalize(format(selectedBucket.start, "MMMM", { locale: fr }))
    : "Aucune lecture";

  const changePeriod = (nextPeriod: StatisticsPeriod) => {
    setPeriod(nextPeriod);
    setSelectedBucketKey(null);
  };

  const goToPreviousPeriod = () => {
    setSelectedBucketKey(null);
    if (period === "week") setWeekAnchor((date) => addWeeks(date, -1));
    if (period === "month") setMonthAnchor((date) => addMonths(date, -1));
  };

  const goToNextPeriod = () => {
    if (!canGoNext) return;
    setSelectedBucketKey(null);
    if (period === "week") setWeekAnchor((date) => addWeeks(date, 1));
    if (period === "month") setMonthAnchor((date) => addMonths(date, 1));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Statistiques" subtitle="Votre progression de lecture" />

      <View style={s.statsHero}>
        <Text style={s.statsProgressValue}>{progressPercentage} %</Text>
        <Text style={s.statsProgressLabel}>{completedDays} jours sur {totalDays}</Text>
        <View style={s.statsProgressTrack}>
          <View style={[s.statsProgressFill, { width: `${progressPercentage}%` }]} />
        </View>
      </View>

      <PeriodTabs onChange={changePeriod} period={period} />

      <View style={s.activitySection}>
        <Text style={s.statsSectionTitle}>Rythme de lecture</Text>
        {period === "year" ? (
          <Text style={s.statsContextLabel}>
            Depuis le début du plan · {capitalize(format(planStart, "MMMM yyyy", { locale: fr }))}
          </Text>
        ) : (
          <PeriodNavigation
            canGoNext={canGoNext}
            canGoPrevious={canGoPrevious}
            label={periodLabel}
            onNext={goToNextPeriod}
            onPrevious={goToPreviousPeriod}
          />
        )}
        <MotionView key={`${period}-${periodLabel}`} layout={false} style={s.chartMotion}>
          <ActivityBars
            buckets={buckets}
            onSelect={setSelectedBucketKey}
            selectedKey={selectedBucket?.key ?? null}
            today={today}
          />
        </MotionView>
        <View style={s.selectedPeriodDetail}>
          <Text numberOfLines={1} style={s.selectedPeriodTitle}>{detailLabel}</Text>
          <Text numberOfLines={1} style={s.selectedPeriodMeta}>
            {selectedBucket?.value ?? 0} passage{selectedBucket?.value === 1 ? "" : "s"}
            {period === "week" ? " lu" + (selectedBucket?.value === 1 ? "" : "s") : ` · ${selectedBucket?.activeDays ?? 0} jour${selectedBucket?.activeDays === 1 ? "" : "s"} actif${selectedBucket?.activeDays === 1 ? "" : "s"}`}
          </Text>
        </View>
      </View>

      <View style={s.statsGrid}>
        <StatMetric label="Série actuelle" suffix="jours" value={activity.currentStreak} />
        <StatMetric label="Record" suffix="jours" value={activity.maxStreak} />
        <StatMetric label="Passages lus" value={activity.chaptersRead || progressQuery.data?.passagesRead || 0} />
        <StatMetric label="Jours actifs" value={activity.activeDays} />
      </View>
    </ScrollView>
  );
}

function StatMetric({ label, suffix, value }: { label: string; suffix?: string; value: number }) {
  return (
    <View style={s.statMetric}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
      {!!suffix && <Text style={s.statSuffix}>{suffix}</Text>}
    </View>
  );
}

export function BadgesScreen() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<BadgeGridItem | null>(null);
  const [filter, setFilter] = useState<"all" | "unlocked">("all");
  const allQuery = useQuery({ queryKey: ["mobile-all-badges"], queryFn: getAllBadges });
  const userQuery = useQuery({ queryKey: ["mobile-user-badges", user?.id], queryFn: () => getUserBadges(user.id), enabled: !!user?.id });
  const progressQuery = useQuery({ queryKey: ["mobile-badge-progress", user?.id], queryFn: () => getBadgeProgress(user.id), enabled: !!user?.id });
  const items = useMemo(() => {
    const unlocked = new Map((userQuery.data || []).map((item) => [item.badge_id, item]));
    const progress = new Map((progressQuery.data || []).map((item) => [item.badge.id, item]));
    return (allQuery.data || []).map((badge) => ({ badge, current: progress.get(badge.id)?.current, progress: progress.get(badge.id)?.progress, required: progress.get(badge.id)?.required, unlocked: unlocked.get(badge.id) }));
  }, [allQuery.data, progressQuery.data, userQuery.data]);
  const unlockedCount = items.filter((item) => item.unlocked).length;
  const completion = items.length ? Math.round((unlockedCount / items.length) * 100) : 0;
  const nextBadge = useMemo(
    () => items
      .filter((item) => !item.unlocked)
      .sort((left, right) => (right.progress ?? 0) - (left.progress ?? 0))[0] ?? null,
    [items],
  );
  const visibleItems = filter === "unlocked" ? items.filter((item) => item.unlocked) : items;
  const isLoading = allQuery.isLoading || userQuery.isLoading || progressQuery.isLoading;

  return (
    <View style={styles.screen}>
      <FlatList
        ListEmptyComponent={isLoading ? (
          <View style={s.badgesEmptyState}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <View style={s.badgesEmptyState}>
            <Award color={colors.muted} size={28} strokeWidth={1.7} />
            <Text style={s.badgesEmptyTitle}>
              {filter === "unlocked" ? "Aucun badge obtenu pour le moment" : "Aucun badge disponible"}
            </Text>
            <Text style={styles.subheading}>Votre progression apparaîtra ici au fil de vos lectures.</Text>
          </View>
        )}
        ListHeaderComponent={(
          <View style={s.badgesHeader}>
            <Header title="Badges" subtitle="Votre collection de récompenses" />

            <View style={s.badgesSummary}>
              <View style={s.badgesSummaryLine}>
                <Text style={s.badgesSummaryValue}>{unlockedCount}</Text>
                <Text style={s.badgesSummaryTotal}>/ {items.length}</Text>
              </View>
              <Text style={s.badgesSummaryLabel}>badges débloqués</Text>
              <View style={s.badgesProgressTrack}>
                <View style={[s.badgesProgressFill, { width: `${completion}%` }]} />
              </View>
            </View>

            {nextBadge ? (
              <View style={s.nextBadgeSection}>
                <Text style={s.badgesSectionTitle}>Prochain badge</Text>
                <Pressable
                  accessibilityLabel={`Voir le badge ${nextBadge.badge.name}`}
                  accessibilityRole="button"
                  onPress={() => setSelected(nextBadge)}
                  style={({ pressed }) => [s.nextBadgeCard, pressed && s.badgePressed]}
                >
                  <BadgeMedallion badge={nextBadge.badge} locked={false} size={72} />
                  <View style={s.nextBadgeCopy}>
                    <Text numberOfLines={1} style={s.nextBadgeTitle}>{nextBadge.badge.name}</Text>
                    <Text numberOfLines={1} style={s.nextBadgeDescription}>{nextBadge.badge.description}</Text>
                    <View style={s.nextBadgeProgressRow}>
                      <Text style={s.nextBadgeProgressText}>
                        {nextBadge.current ?? 0} sur {nextBadge.required ?? "?"}
                      </Text>
                      <View style={s.nextBadgeProgressTrack}>
                        <View style={[s.nextBadgeProgressFill, { width: `${nextBadge.progress ?? 0}%` }]} />
                      </View>
                    </View>
                  </View>
                  <ChevronRight color={colors.muted} size={20} strokeWidth={1.8} />
                </Pressable>
              </View>
            ) : null}

            <View style={s.collectionHeadingRow}>
              <Text style={s.badgesSectionTitle}>Collection</Text>
              <View accessibilityRole="tablist" style={s.badgeFilters}>
                <BadgeFilter active={filter === "all"} label="Tous" onPress={() => setFilter("all")} />
                <BadgeFilter active={filter === "unlocked"} label="Obtenus" onPress={() => setFilter("unlocked")} />
              </View>
            </View>
          </View>
        )}
        columnWrapperStyle={s.badgeRow}
        contentContainerStyle={[s.content, s.badgesContent]}
        data={isLoading ? [] : visibleItems}
        keyExtractor={(item) => item.badge.id}
        numColumns={2}
        renderItem={({ item }) => <BadgeTile item={item} onPress={() => setSelected(item)} />}
      />
      <Modal animationType="fade" onRequestClose={() => setSelected(null)} transparent visible={!!selected}>
        <Pressable style={s.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={s.modalCard}>{selected ? <BadgeDetails item={selected} /> : null}</Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function BadgeFilter({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [s.badgeFilter, active && s.badgeFilterActive, pressed && s.badgePressed]}
    >
      <Text style={[s.badgeFilterText, active && s.badgeFilterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function BadgeTile({ item, onPress }: { item: BadgeGridItem; onPress: () => void }) {
  const locked = !item.unlocked;
  const hasProgress = locked && typeof item.required === "number" && item.required > 0;
  return (
    <Pressable
      accessibilityLabel={`${item.badge.name}, ${locked ? "verrouillé" : "obtenu"}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [s.badgeTile, pressed && s.badgePressed]}
    >
      <BadgeMedallion badge={item.badge} locked={locked} size={76} />
      <Text numberOfLines={2} style={[s.badgeName, locked && s.badgeNameLocked]}>{item.badge.name}</Text>
      {item.unlocked ? (
        <Text numberOfLines={1} style={s.badgeStatus}>Obtenu le {format(new Date(item.unlocked.unlocked_at), "d MMM", { locale: fr })}</Text>
      ) : hasProgress ? (
        <>
          <Text style={s.badgeStatus}>{item.current ?? 0} / {item.required}</Text>
          <View style={s.badgeTileProgressTrack}>
            <View style={[s.badgeTileProgressFill, { width: `${item.progress ?? 0}%` }]} />
          </View>
        </>
      ) : (
        <Text style={s.badgeStatus}>À découvrir</Text>
      )}
    </Pressable>
  );
}

function getBadgeIcon(badge: Badge): IconType {
  const type = badge.criteria?.type;
  if (type === "chapters_read") return Number(badge.criteria?.count) === 1 ? Target : BookOpen;
  if (type === "days_completed") return CalendarDays;
  if (type === "milestone") return Crown;
  if (type === "streak_days" || type === "fixed_time_streak") return Flame;
  if (type === "time_of_day") return badge.criteria?.period === "evening" ? Moon : Sunrise;
  if (type === "resume_after_gap") return RotateCcw;
  if (type === "book_completed") return BookOpen;
  if (badge.name.toLowerCase().includes("finisseur")) return Flag;
  return Award;
}

function colorWithAlpha(color: string, alpha: number) {
  const normalized = /^#[0-9A-F]{6}$/i.test(color) ? color : colors.primary;
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function BadgeMedallion({ badge, locked, size }: { badge: Badge; locked: boolean; size: number }) {
  const Icon = getBadgeIcon(badge);
  const accent = locked ? colors.muted : badge.color || colors.primary;
  return (
    <View
      style={[
        s.badgeMedallion,
        {
          backgroundColor: locked ? colors.surfaceSoft : colorWithAlpha(accent, 0.14),
          borderColor: locked ? colors.border : colorWithAlpha(accent, 0.28),
          borderRadius: size / 2,
          height: size,
          width: size,
        },
      ]}
    >
      <Icon color={accent} size={Math.round(size * 0.38)} strokeWidth={1.7} />
      {locked ? (
        <View style={s.badgeLockMark}>
          <Lock color={colors.muted} size={11} strokeWidth={2} />
        </View>
      ) : null}
    </View>
  );
}

function BadgeDetails({ item }: { item: BadgeGridItem }) {
  return (
    <View style={s.badgeDetails}>
      <View style={s.badgeDetailsMedallion}>
        <BadgeMedallion badge={item.badge} locked={!item.unlocked} size={88} />
      </View>
      <Text style={s.modalTitle}>{item.badge.name}</Text>
      <Text style={[styles.subheading, s.badgeDetailsDescription]}>{item.badge.description}</Text>
      <Text style={s.detail}>{item.unlocked ? `Obtenu le ${formatDate(item.unlocked.unlocked_at)}` : `Progression : ${item.current ?? 0}/${item.required ?? "?"} (${Math.round(item.progress ?? 0)} %)`}</Text>
    </View>
  );
}

export function NotificationsScreen() {
  const notifications = useNotificationPreferences();

  const updatePreference = async (
    patch: Parameters<typeof notifications.update>[0]
  ) => {
    const result = await notifications.update(patch);
    if (!result.success) {
      Alert.alert("Notifications", result.error);
    }
  };

  if (notifications.loading) {
    return (
      <View style={[styles.screen, s.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const prefs = notifications.prefs;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Notifications" subtitle="Rappels, versets, badges et centre de notifications." />
      <View style={s.card}>
        <View style={s.rowLeft}>
          <Bell color={colors.primary} size={20} />
          <Text style={s.rowTitle}>Notifications push mobiles</Text>
        </View>
        <Text style={styles.subheading}>
          Le canal mobile sera activé lorsqu'un stockage Expo distinct du Web Push sera disponible.
        </Text>
      </View>
      {prefs ? (
        <View style={s.card}>
          <PreferenceRow
            disabled={notifications.saving}
            icon={CalendarClock}
            label="Rappel quotidien"
            onChange={() => void updatePreference({ reading_reminder_enabled: !prefs.reading_reminder_enabled })}
            value={prefs.reading_reminder_enabled}
          />
          <TimePicker
            disabled={notifications.saving}
            value={prefs.reading_reminder_time.slice(0, 5)}
            onChange={(value) => void updatePreference({ reading_reminder_time: value })}
          />
          <PreferenceRow
            disabled={notifications.saving}
            icon={BookOpen}
            label="Verset du jour"
            onChange={() => void updatePreference({ daily_verse_enabled: !prefs.daily_verse_enabled })}
            value={prefs.daily_verse_enabled}
          />
          <TimePicker
            disabled={notifications.saving}
            value={prefs.daily_verse_time.slice(0, 5)}
            onChange={(value) => void updatePreference({ daily_verse_time: value })}
          />
          <PreferenceRow
            disabled={notifications.saving}
            icon={Award}
            label="Badges"
            onChange={() => void updatePreference({ badges_enabled: !prefs.badges_enabled })}
            value={prefs.badges_enabled}
          />
        </View>
      ) : (
        <View style={s.card}>
          <Text style={styles.subheading}>
            {notifications.error ?? "Les préférences ne sont pas disponibles."}
          </Text>
          <Pressable onPress={() => void notifications.reload()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      )}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Centre de notifications</Text>
        <Text style={styles.subheading}>
          Aucun historique mobile n'est disponible dans le contrat Supabase actuel.
        </Text>
      </View>
    </ScrollView>
  );
}

function PreferenceRow({ disabled = false, icon: Icon, label, onChange, value }: { disabled?: boolean; icon: IconType; label: string; onChange: () => void; value: boolean }) {
  return <View style={[s.preferenceRow, disabled && { opacity: 0.6 }]}><View style={s.rowLeft}><Icon color={colors.primary} size={20} /><Text style={s.rowTitle}>{label}</Text></View><Switch disabled={disabled} onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ false: colors.border, true: colors.primary }} value={value} /></View>;
}

function TimePicker({ disabled = false, onChange, value }: { disabled?: boolean; onChange: (value: string) => void; value: string }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} style={disabled && { opacity: 0.6 }}>{timeOptions.map((item) => <Chip active={value === item} key={item} label={item} onPress={() => { if (!disabled) onChange(item); }} />)}</ScrollView>;
}

export function SubscriptionScreen() {
  const premium = usePremium();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Mon abonnement" subtitle="Votre statut actuel Beree 365." />
      <View style={s.heroCard}><Crown color="#FFFFFF" size={30} /><Text style={s.heroTitle}>{premium.isPremium ? "Premium actif" : "Compte gratuit"}</Text><Text style={s.heroSubtitle}>{premium.isPremium ? `Expire le ${formatDate(premium.premiumEndDate?.toISOString())}` : premium.isExpired ? "Votre acces Premium a expire." : "Passez a Premium pour debloquer toute l'experience."}</Text></View>
      {!premium.isPremium ? <Pressable onPress={() => router.push("/premium")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Passer a Premium</Text></Pressable> : null}
    </ScrollView>
  );
}

export function PremiumScreen() {
  const { refreshProfile } = useAuth();
  const [promo, setPromo] = useState("");
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);
  const benefits = [["Plans enrichis", "Accedez aux parcours avances.", BookOpen], ["Statistiques completes", "Suivez vos streaks en profondeur.", Sparkles], ["Badges exclusifs", "Debloquez des recompenses supplementaires.", Award]] as const;

  const redeemCode = async () => {
    if (isRedeemingCode) return;

    setIsRedeemingCode(true);
    try {
      const result = await redeemPremiumCode(promo);

      if (result.status === "activated") {
        setPromo("");
        await refreshProfile();
      }

      Alert.alert(
        result.status === "activated" ? "Premium activé" : "Code Premium",
        result.message ?? "Le code Premium n'a pas pu être traité."
      );
    } finally {
      setIsRedeemingCode(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <View style={s.heroCard}><Crown color="#FFFFFF" size={34} /><Text style={s.heroTitle}>Beree Premium</Text><Text style={s.heroSubtitle}>Une experience plus complete pour accompagner votre lecture biblique.</Text></View>
      {benefits.map(([title, subtitle, Icon]) => <View key={title} style={s.benefitRow}><View style={s.roundIcon}><Icon color={colors.primary} size={20} /></View><View style={{ flex: 1 }}><Text style={s.rowTitle}>{title}</Text><Text style={styles.subheading}>{subtitle}</Text></View></View>)}
      <Pressable onPress={() => Alert.alert("Premium", "Le fournisseur de paiement reste a valider : RevenueCat ou in-app purchase Expo.")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Activer</Text></Pressable>
      <View style={s.card}>
        <Text style={s.sectionTitle}>Code promo</Text>
        <TextInput
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isRedeemingCode}
          onChangeText={setPromo}
          placeholder="CODEPROMO"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={promo}
        />
        <Pressable
          disabled={isRedeemingCode || !promo.trim()}
          onPress={redeemCode}
          style={[
            styles.secondaryButton,
            { opacity: isRedeemingCode || !promo.trim() ? 0.6 : 1 },
          ]}
        >
          {isRedeemingCode ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.secondaryButtonText}>Appliquer</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

export function PrivacyScreen() {
  const consents = usePrivacyConsents();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const exportData = async () => {
    if (isExportingData) return;

    setIsExportingData(true);
    try {
      await exportCurrentUserData();
    } catch (error: any) {
      Alert.alert(
        "Export impossible",
        error?.message || "Impossible de préparer l'export de vos données.",
      );
    } finally {
      setIsExportingData(false);
    }
  };
  const deleteAccount = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteCurrentUserAccount();

            if (!result.success) {
              setIsDeletingAccount(false);
              Alert.alert("Suppression impossible", result.error);
            }
          },
        },
      ]
    );
  };

  const updateAnalyticsConsent = async () => {
    const result = await consents.setAnalytics(!consents.analytics);
    if (!result.success) {
      Alert.alert("Consentement non enregistré", result.error);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Confidentialite" subtitle="Controlez vos consentements et vos donnees." />
      {consents.loading || (!consents.analytics && consents.error) ? (
        <View style={s.card}>
          {consents.loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.subheading}>{consents.error}</Text>
              <Pressable onPress={() => void consents.reload()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Réessayer</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={s.card}>
          <PreferenceRow
            disabled={consents.saving}
            icon={Shield}
            label="Mesure d'audience"
            onChange={() => void updateAnalyticsConsent()}
            value={consents.analytics}
          />
          <Text style={styles.subheading}>
            Le choix Marketing n'est pas proposé : aucun consentement correspondant n'est défini dans le contrat Supabase actuel.
          </Text>
        </View>
      )}
      <Pressable
        disabled={isExportingData}
        onPress={() => void exportData()}
        style={[styles.secondaryButton, { opacity: isExportingData ? 0.6 : 1 }]}
      >
        {isExportingData ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>Exporter mes données</Text>
        )}
      </Pressable>
      <Pressable
        disabled={isDeletingAccount}
        onPress={deleteAccount}
        style={[styles.secondaryButton, { borderColor: colors.danger, opacity: isDeletingAccount ? 0.6 : 1 }]}
      >
        {isDeletingAccount ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Supprimer mon compte</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile, refreshProfile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [startDate, setStartDate] = useState(profile?.start_date || "");
  const [draftStartDate, setDraftStartDate] = useState(() => {
    const initialDate = parseISO(profile?.start_date || "");
    return isValid(initialDate) ? initialDate : new Date();
  });
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [avatarOperation, setAvatarOperation] = useState<"upload" | "remove" | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const initials = getProfileInitials(fullName, user?.email);
  const isUpdatingAvatar = avatarOperation !== null;
  const parsedStartDate = parseISO(startDate);
  const readableStartDate = isValid(parsedStartDate)
    ? format(parsedStartDate, "d MMMM yyyy", { locale: fr })
    : "Choisir une date";

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || null);
  }, [profile?.avatar_url]);

  const pickAvatar = async (source: "camera" | "library") => {
    if (!user?.id || isUpdatingAvatar) return;

    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        const permissionMessage = source === "camera"
          ? "Autorisez l'accès à l'appareil photo pour prendre votre portrait."
          : "Autorisez l'accès à vos photos pour choisir votre avatar.";

        Alert.alert(
          "Autorisation nécessaire",
          permissionMessage,
          permission.canAskAgain
            ? [{ text: "Compris" }]
            : [
                { text: "Annuler", style: "cancel" },
                { text: "Ouvrir les réglages", onPress: () => void Linking.openSettings() },
              ],
        );
        return;
      }

      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            cameraType: ImagePicker.CameraType.front,
            mediaTypes: ["images"],
            quality: 0.72,
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            mediaTypes: ["images"],
            quality: 0.72,
          });

      if (result.canceled || !result.assets[0]) return;

      setAvatarOperation("upload");
      const asset = result.assets[0];
      const uploadResult = await uploadProfileAvatar({
        mimeType: asset.mimeType,
        uri: asset.uri,
        userId: user.id,
      });

      if (uploadResult.success === false) {
        Alert.alert("Photo de profil", uploadResult.error);
        return;
      }

      setAvatarUrl(uploadResult.avatarUrl);
      await refreshProfile();
    } catch {
      Alert.alert(
        source === "camera" ? "Appareil photo indisponible" : "Photothèque indisponible",
        source === "camera"
          ? "La caméra n'a pas pu être ouverte. Vérifiez son autorisation dans les réglages du téléphone."
          : "La photothèque n'a pas pu être ouverte. Réessayez dans quelques instants.",
      );
    } finally {
      setAvatarOperation(null);
    }
  };

  const removeAvatar = async () => {
    if (!user?.id || !avatarUrl || isUpdatingAvatar) return;

    setAvatarOperation("remove");
    const removeResult = await removeProfileAvatar(user.id);
    setAvatarOperation(null);

    if (removeResult.success === false) {
      Alert.alert("Photo de profil", removeResult.error);
      return;
    }

    setAvatarUrl(null);
    await refreshProfile();
  };

  const confirmAvatarRemoval = () => {
    Alert.alert(
      "Retirer la photo ?",
      "Votre photo de profil sera supprimée. Vos initiales seront affichées à la place.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Retirer", style: "destructive", onPress: () => void removeAvatar() },
      ],
    );
  };

  const chooseAvatarSource = () => {
    setIsAvatarMenuOpen(true);
  };

  const closeAvatarMenu = (action?: "camera" | "library" | "remove") => {
    setIsAvatarMenuOpen(false);
    if (!action) return;

    setTimeout(() => {
      if (action === "remove") {
        confirmAvatarRemoval();
        return;
      }

      void pickAvatar(action);
    }, 240);
  };

  const openDatePicker = () => {
    setDraftStartDate(isValid(parsedStartDate) ? parsedStartDate : new Date());
    setIsDatePickerOpen(true);
  };

  const handleDateChange = (event: { type: string }, value?: Date) => {
    if (Platform.OS === "android") {
      setIsDatePickerOpen(false);
      if (event.type === "set" && value) setStartDate(format(value, "yyyy-MM-dd"));
      return;
    }

    if (value) setDraftStartDate(value);
  };

  const confirmDate = () => {
    setStartDate(format(draftStartDate, "yyyy-MM-dd"));
    setIsDatePickerOpen(false);
  };

  const clearReadingData = () => {
    if (isClearingData) return;

    Alert.alert(
      "Effacer mes données de lecture ?",
      "Votre progression, vos badges, vos favoris et l'historique des notifications seront supprimés. Votre profil et votre compte resteront actifs.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Effacer",
          style: "destructive",
          onPress: async () => {
            setIsClearingData(true);
            const result = await clearCurrentUserReadingData();

            if (!result.success) {
              setIsClearingData(false);
              Alert.alert("Effacement impossible", result.error);
              return;
            }

            await Promise.all([refreshProfile(), queryClient.invalidateQueries()]);
            setStartDate(format(new Date(), "yyyy-MM-dd"));
            setIsClearingData(false);
            Alert.alert("Données effacées", "Votre parcours de lecture a été remis à zéro.");
          },
        },
      ],
    );
  };

  const deleteAccount = () => {
    if (isDeletingAccount) return;

    Alert.alert(
      "Supprimer définitivement le compte ?",
      "Toutes vos données seront supprimées et cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer le compte",
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            const result = await deleteCurrentUserAccount();

            if (!result.success) {
              setIsDeletingAccount(false);
              Alert.alert("Suppression impossible", result.error);
            }
          },
        },
      ],
    );
  };

  const save = async () => {
    if (!user?.id) return;
    if (fullName.trim().length < 2) return Alert.alert("Profil", "Le nom doit contenir au moins 2 caracteres.");
    const normalizedStartDate = startDate.trim();
    if (!isValidIsoDate(normalizedStartDate)) {
      return Alert.alert("Profil", "La date de début doit respecter le format AAAA-MM-JJ.");
    }

    setIsSaving(true);
    try {
      const profileResult = await updateUserProfile(user.id, { full_name: fullName.trim() });
      if (!profileResult.success) {
        return Alert.alert("Profil", profileResult.error ?? "Impossible d'enregistrer le profil.");
      }

      if (normalizedStartDate !== profile?.start_date) {
        const dateResult = await updatePlanStartDate(normalizedStartDate);
        if (!dateResult.success) {
          await refreshProfile();
          return Alert.alert(
            "Date de début",
            `Votre nom a été enregistré. ${dateResult.error ?? "La date n'a pas pu être modifiée."}`
          );
        }
      }

      await refreshProfile();
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[s.content, s.editProfileContent]}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          title="Modifier le profil"
          subtitle="Vos informations personnelles"
        />

        <Pressable
          accessibilityLabel="Changer la photo de profil"
          accessibilityRole="button"
          disabled={isUpdatingAvatar}
          onPress={chooseAvatarSource}
          style={({ pressed }) => [
            s.editAvatarSection,
            pressed && !isUpdatingAvatar && s.editAvatarPressed,
          ]}
        >
          <View style={s.avatarPreviewWrap}>
            <ProfileAvatar avatarUrl={avatarUrl} initials={initials} size={96} />
            <View style={s.avatarActionBadge}>
              {avatarOperation === "upload" ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Camera color="#FFFFFF" size={17} strokeWidth={2.2} />
              )}
            </View>
          </View>
          <Text style={s.avatarEditLabel}>
            {avatarOperation === "upload" ? "Envoi de la photo…" : "Modifier la photo"}
          </Text>
        </Pressable>

        <View style={s.profileForm}>
          <Text style={s.formSectionLabel}>Informations</Text>
          <View style={s.formField}>
            <Text style={s.inputLabel}>Nom complet</Text>
            <TextInput
              onChangeText={setFullName}
              placeholder="Votre nom"
              placeholderTextColor={colors.muted}
              style={s.profileInput}
              value={fullName}
            />
          </View>
          <View style={s.formField}>
            <Text style={s.inputLabel}>Début du plan</Text>
            <Pressable
              accessibilityLabel={`Modifier la date de début, ${readableStartDate}`}
              accessibilityRole="button"
              onPress={openDatePicker}
              style={({ pressed }) => [s.dateField, pressed && s.dateFieldPressed]}
            >
              <CalendarDays color={colors.muted} size={21} strokeWidth={1.8} />
              <Text style={s.dateFieldValue}>{readableStartDate}</Text>
              <ChevronRight color={colors.muted} size={20} strokeWidth={1.8} />
            </Pressable>
            <Text style={s.fieldHelper}>Cette date détermine votre jour de lecture actuel.</Text>
          </View>
        </View>

        <View style={s.dataSection}>
          <Text style={s.dataSectionTitle}>Données et compte</Text>
          <Text style={s.dataSectionDescription}>
            Gérez séparément votre parcours de lecture et votre compte Bérée 365.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isClearingData || isDeletingAccount}
            onPress={clearReadingData}
            style={({ pressed }) => [s.dataAction, pressed && s.dataActionPressed]}
          >
            <View style={s.dataActionIcon}>
              {isClearingData ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <RotateCcw color={colors.primary} size={20} strokeWidth={1.9} />
              )}
            </View>
            <View style={s.dataActionCopy}>
              <Text style={s.dataActionTitle}>Effacer mes données de lecture</Text>
              <Text style={s.dataActionSubtitle}>Progression, badges, favoris et historique.</Text>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isDeletingAccount || isClearingData}
            onPress={deleteAccount}
            style={({ pressed }) => [s.dataAction, s.dangerAction, pressed && s.dataActionPressed]}
          >
            <View style={[s.dataActionIcon, s.dangerActionIcon]}>
              {isDeletingAccount ? (
                <ActivityIndicator color={colors.danger} size="small" />
              ) : (
                <UserX color={colors.danger} size={20} strokeWidth={1.9} />
              )}
            </View>
            <View style={s.dataActionCopy}>
              <Text style={[s.dataActionTitle, s.dangerActionTitle]}>Supprimer mon compte</Text>
              <Text style={s.dataActionSubtitle}>Suppression définitive du compte et de toutes ses données.</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {Platform.OS === "android" && isDatePickerOpen && (
        <DateTimePicker
          maximumDate={new Date()}
          mode="date"
          onChange={handleDateChange}
          value={draftStartDate}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsDatePickerOpen(false)}
          transparent
          visible={isDatePickerOpen}
        >
          <Pressable onPress={() => setIsDatePickerOpen(false)} style={s.dateModalBackdrop}>
            <Pressable onPress={(event) => event.stopPropagation()} style={s.dateModalCard}>
              <Text style={s.dateModalTitle}>Début du plan</Text>
              <DateTimePicker
                display="spinner"
                locale="fr-FR"
                maximumDate={new Date()}
                mode="date"
                onChange={handleDateChange}
                value={draftStartDate}
              />
              <View style={s.dateModalActions}>
                <Pressable
                  onPress={() => setIsDatePickerOpen(false)}
                  style={s.dateModalSecondaryButton}
                >
                  <Text style={s.dateModalSecondaryText}>Annuler</Text>
                </Pressable>
                <Pressable onPress={confirmDate} style={s.dateModalPrimaryButton}>
                  <Text style={styles.primaryButtonText}>Valider</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => closeAvatarMenu()}
        statusBarTranslucent
        transparent
        visible={isAvatarMenuOpen}
      >
        <Pressable
          accessibilityLabel="Fermer le menu de la photo"
          accessibilityRole="button"
          onPress={() => closeAvatarMenu()}
          style={s.avatarMenuBackdrop}
        >
          <Pressable
            accessibilityViewIsModal
            onPress={(event) => event.stopPropagation()}
            style={[s.avatarMenuSheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
          >
            <View style={s.avatarMenuHandle} />
            <View style={s.avatarMenuHeader}>
              <Text style={s.avatarMenuTitle}>Photo de profil</Text>
              <Text style={s.avatarMenuSubtitle}>Choisissez une action</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => closeAvatarMenu("camera")}
              style={({ pressed }) => [s.avatarMenuItem, pressed && s.avatarMenuItemPressed]}
            >
              <Camera color={colors.text} size={21} strokeWidth={1.9} />
              <Text style={s.avatarMenuItemText}>Appareil photo</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => closeAvatarMenu("library")}
              style={({ pressed }) => [s.avatarMenuItem, pressed && s.avatarMenuItemPressed]}
            >
              <ImageIcon color={colors.text} size={21} strokeWidth={1.9} />
              <Text style={s.avatarMenuItemText}>Photothèque</Text>
            </Pressable>

            {!!avatarUrl && (
              <Pressable
                accessibilityRole="button"
                onPress={() => closeAvatarMenu("remove")}
                style={({ pressed }) => [s.avatarMenuItem, pressed && s.avatarMenuItemPressed]}
              >
                <Trash2 color={colors.danger} size={21} strokeWidth={1.9} />
                <Text style={[s.avatarMenuItemText, s.avatarMenuDangerText]}>Retirer la photo</Text>
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              onPress={() => closeAvatarMenu()}
              style={({ pressed }) => [s.avatarMenuCancel, pressed && s.avatarMenuItemPressed]}
            >
              <Text style={s.avatarMenuCancelText}>Annuler</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[s.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          disabled={isSaving || isUpdatingAvatar || isClearingData || isDeletingAccount}
          onPress={save}
          style={[
            styles.primaryButton,
            (isSaving || isUpdatingAvatar || isClearingData || isDeletingAccount) && s.disabledButton,
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Enregistrer les modifications</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function MarkdownInfoScreen({ content, title }: { content: string; title: string }) {
  return <ScrollView style={styles.screen} contentContainerStyle={s.content}><Header title={title} /><View style={s.card}>{content.split("\n").map((line, index) => line.startsWith("## ") ? <Text key={index} style={s.sectionTitle}>{line.replace("## ", "")}</Text> : line.startsWith("- ") ? <Text key={index} style={styles.subheading}>• {line.replace("- ", "")}</Text> : line.trim() ? <Text key={index} style={styles.subheading}>{line}</Text> : <View key={index} style={{ height: 8 }} />)}</View></ScrollView>;
}

export function SettingsScreen() {
  const rows = [["Notifications", "/profile/notifications", Bell], ["Confidentialite", "/profile/privacy", Shield], ["Aide", "/profile/help", Info], ["A propos", "/profile/about", Info], ["Conditions", "/terms", Mail], ["Politique cookies", "/cookies-policy", Gift]] as const;
  return <ScrollView style={styles.screen} contentContainerStyle={s.content}><Header title="Parametres" />{rows.map(([label, href, Icon]) => <Pressable key={href} onPress={() => router.push(href as any)} style={s.settingsRow}><View style={s.rowLeft}><Icon color={colors.primary} size={20} /><Text style={s.rowTitle}>{label}</Text></View><ChevronRight color={colors.muted} size={20} /></Pressable>)}</ScrollView>;
}

export function StaticInfoScreen({ title, text }: { title: string; text: string }) {
  return <MarkdownInfoScreen content={text} title={title} />;
}

const s = StyleSheet.create({
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  activeChipText: { color: "#FFFFFF" },
  avatarActionBadge: { alignItems: "center", backgroundColor: colors.primary, borderColor: colors.surface, borderRadius: 999, borderWidth: 3, bottom: -2, height: 34, justifyContent: "center", position: "absolute", right: -2, width: 34 },
  avatarMenuBackdrop: { backgroundColor: "rgba(20, 18, 16, 0.42)", flex: 1, justifyContent: "flex-end" },
  avatarMenuCancel: { alignItems: "center", backgroundColor: colors.surfaceSoft, borderCurve: "continuous", borderRadius: 14, justifyContent: "center", marginTop: 8, minHeight: 52, paddingHorizontal: 16 },
  avatarMenuCancelText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  avatarMenuDangerText: { color: colors.danger },
  avatarMenuHandle: { alignSelf: "center", backgroundColor: colors.border, borderRadius: 999, height: 5, width: 40 },
  avatarMenuHeader: { gap: 3, paddingBottom: 8, paddingHorizontal: 4, paddingTop: 4 },
  avatarMenuItem: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 14, minHeight: 54, paddingHorizontal: 4 },
  avatarMenuItemPressed: { opacity: 0.58 },
  avatarMenuItemText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  avatarMenuSheet: { backgroundColor: colors.surface, borderCurve: "continuous", borderTopLeftRadius: 22, borderTopRightRadius: 22, gap: 2, paddingHorizontal: 20, paddingTop: 10 },
  avatarMenuSubtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14 },
  avatarMenuTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 20 },
  avatarPicker: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 16, padding: 16 },
  avatarPickerCopy: { flex: 1, gap: 5 },
  avatarPickerPressed: { backgroundColor: colors.surfaceSoft, transform: [{ scale: 0.99 }] },
  activityChart: { height: 206, justifyContent: "flex-end", position: "relative" },
  activitySection: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14, paddingBottom: 4 },
  avatarPreviewWrap: { position: "relative" },
  badgeDetails: { gap: 12 },
  badgeDetailsDescription: { textAlign: "center" },
  badgeDetailsMedallion: { alignItems: "center" },
  badgeFilter: { alignItems: "center", borderCurve: "continuous", borderRadius: 12, justifyContent: "center", minHeight: 42, paddingHorizontal: 16 },
  badgeFilterActive: { backgroundColor: colors.primary },
  badgeFilterText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14 },
  badgeFilterTextActive: { color: "#FFFFFF", fontFamily: fonts.semibold },
  badgeFilters: { borderColor: colors.border, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, flexDirection: "row", padding: 2 },
  badgeLockMark: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, bottom: -2, height: 24, justifyContent: "center", position: "absolute", right: -2, width: 24 },
  badgeMedallion: { alignItems: "center", borderWidth: 1, justifyContent: "center", position: "relative" },
  badgeName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20, minHeight: 40, textAlign: "center" },
  badgeNameLocked: { color: colors.primaryDark },
  badgePressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
  badgeRow: { gap: 12 },
  badgeStatus: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, textAlign: "center" },
  badgeTile: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderCurve: "continuous", borderRadius: 15, borderWidth: 1, flex: 1, gap: 7, marginBottom: 12, minHeight: 174, paddingHorizontal: 10, paddingVertical: 16 },
  badgeTileProgressFill: { backgroundColor: colors.primary, borderRadius: 999, height: "100%" },
  badgeTileProgressTrack: { backgroundColor: colors.surfaceSoft, borderRadius: 999, height: 5, marginTop: 1, overflow: "hidden", width: "78%" },
  badgesContent: { paddingBottom: 36 },
  badgesEmptyState: { alignItems: "center", gap: 10, paddingHorizontal: 28, paddingVertical: 36 },
  badgesEmptyTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, textAlign: "center" },
  badgesHeader: { gap: 28, marginBottom: 18 },
  badgesProgressFill: { backgroundColor: colors.primary, borderRadius: 999, height: "100%" },
  badgesProgressTrack: { backgroundColor: colors.border, borderRadius: 999, height: 7, marginTop: 9, overflow: "hidden" },
  badgesSectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  badgesSummary: { paddingHorizontal: 4 },
  badgesSummaryLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 16, marginTop: -2 },
  badgesSummaryLine: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  badgesSummaryTotal: { color: colors.muted, fontFamily: fonts.regular, fontSize: 32 },
  badgesSummaryValue: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 50, letterSpacing: -1.2, lineHeight: 57 },
  backButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  backButtonPressed: { backgroundColor: colors.surfaceSoft },
  benefitRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 14, padding: 16 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  center: { alignItems: "center" },
  chartBar: { backgroundColor: colors.primary, borderRadius: 5, minHeight: 3, opacity: 0.82, width: "62%" },
  chartBarArea: { alignItems: "center", height: 150, justifyContent: "flex-end", width: "100%" },
  chartBarUnavailable: { backgroundColor: colors.surfaceSoft, opacity: 0.5 },
  chartColumn: { alignItems: "center", borderCurve: "continuous", borderRadius: 12, flex: 1, gap: 8, minWidth: 0, paddingHorizontal: 2, paddingTop: 8 },
  chartColumnPressed: { opacity: 0.66 },
  chartColumnSelected: { backgroundColor: colors.surfaceSoft },
  chartColumns: { alignItems: "flex-end", flexDirection: "row", gap: 4, height: 206 },
  chartGuide: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  chartGuides: { bottom: 36, height: 150, justifyContent: "space-between", left: 0, position: "absolute", right: 0 },
  chartLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 11, lineHeight: 14, minHeight: 28, textAlign: "center" },
  chartLabelSelected: { color: colors.primary, fontFamily: fonts.semibold },
  chartMotion: { minHeight: 206 },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, marginRight: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipText: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 12 },
  collectionHeadingRow: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  content: { alignSelf: "center", gap: 16, maxWidth: 860, padding: 20, paddingBottom: 112, width: "100%" },
  dangerAction: { borderBottomColor: "transparent" },
  dangerActionIcon: { backgroundColor: "#FCEAE8" },
  dangerActionTitle: { color: colors.danger },
  dataAction: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 14, minHeight: 76, paddingVertical: 12 },
  dataActionCopy: { flex: 1, gap: 4 },
  dataActionIcon: { alignItems: "center", backgroundColor: colors.surfaceSoft, borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  dataActionPressed: { opacity: 0.58 },
  dataActionSubtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  dataActionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  dataSection: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: 4, marginTop: 22, paddingTop: 24 },
  dataSectionDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  dataSectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 19 },
  dateField: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 56, paddingHorizontal: 15 },
  dateFieldPressed: { backgroundColor: colors.surfaceSoft },
  dateFieldValue: { color: colors.text, flex: 1, fontFamily: fonts.medium, fontSize: 16 },
  dateModalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  dateModalBackdrop: { alignItems: "center", backgroundColor: "rgba(20, 18, 16, 0.42)", flex: 1, justifyContent: "center", padding: 24 },
  dateModalCard: { backgroundColor: colors.surface, borderCurve: "continuous", borderRadius: 20, maxWidth: 380, padding: 20, width: "100%" },
  dateModalPrimaryButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 50 },
  dateModalSecondaryButton: { alignItems: "center", borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 50 },
  dateModalSecondaryText: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  dateModalTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 20, textAlign: "center" },
  deleteButton: { alignItems: "center", borderColor: colors.border, borderRadius: 999, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  detail: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  editAvatarPressed: { opacity: 0.62, transform: [{ scale: 0.99 }] },
  editAvatarSection: { alignItems: "center", alignSelf: "center", gap: 10, minHeight: 160, paddingHorizontal: 20, paddingVertical: 14 },
  editProfileContent: { paddingBottom: 142 },
  faded: { opacity: 0.45 },
  fieldHelper: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  formField: { gap: 8 },
  formSectionLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.1, textTransform: "uppercase" },
  header: { gap: 4 },
  detailHeaderCopy: { flex: 1, gap: 4, minWidth: 0 },
  detailHeaderRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  heroCard: { backgroundColor: colors.primary, borderRadius: 22, gap: 12, padding: 22 },
  heroSubtitle: { color: "rgba(255,255,255,0.86)", fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  heroTitle: { color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: 26 },
  inputLabel: { color: colors.text, fontFamily: fonts.semibold, fontSize: 14 },
  lockBadge: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 999, bottom: -2, height: 22, justifyContent: "center", position: "absolute", right: -2, width: 22 },
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(0,0,0,0.36)", flex: 1, justifyContent: "center", padding: 28 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 22, maxWidth: 360, padding: 22, width: "100%" },
  modalTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 22, textAlign: "center" },
  muted: { color: colors.muted },
  nextBadgeCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderCurve: "continuous", borderRadius: 15, borderWidth: 1, flexDirection: "row", gap: 14, minHeight: 112, padding: 15 },
  nextBadgeCopy: { flex: 1, gap: 4, minWidth: 0 },
  nextBadgeDescription: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  nextBadgeProgressFill: { backgroundColor: colors.primary, borderRadius: 999, height: "100%" },
  nextBadgeProgressRow: { gap: 6, marginTop: 3 },
  nextBadgeProgressText: { color: colors.text, fontFamily: fonts.medium, fontSize: 13 },
  nextBadgeProgressTrack: { backgroundColor: colors.surfaceSoft, borderRadius: 999, height: 6, overflow: "hidden" },
  nextBadgeSection: { gap: 12 },
  nextBadgeTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 17 },
  notificationRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 12 },
  preferenceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  periodArrow: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  periodArrowDisabled: { opacity: 0.22 },
  periodNavigation: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  periodTitle: { color: colors.text, flex: 1, fontFamily: fonts.semibold, fontSize: 17, textAlign: "center" },
  profileForm: { gap: 20 },
  profileInput: { backgroundColor: colors.surface, borderColor: colors.border, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16, minHeight: 56, paddingHorizontal: 15 },
  roundIcon: { alignItems: "center", backgroundColor: colors.surfaceSoft, borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  rowLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  rowTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  avatarEditLabel: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  sectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
  settingsRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  selectedPeriodDetail: { alignItems: "baseline", borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", flexWrap: "wrap", gap: 7, paddingVertical: 15 },
  selectedPeriodMeta: { color: colors.muted, flexShrink: 1, fontFamily: fonts.regular, fontSize: 14 },
  selectedPeriodTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  statLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  statMetric: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexBasis: "48%", flexGrow: 1, minHeight: 108, paddingHorizontal: 16, paddingVertical: 14 },
  statSuffix: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: -3 },
  statValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 32, lineHeight: 38 },
  statsContextLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, marginTop: -7 },
  statsGrid: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", flexWrap: "wrap", marginHorizontal: -16 },
  statsHero: { gap: 8, paddingBottom: 14, paddingTop: 8 },
  statsProgressFill: { backgroundColor: colors.primary, borderRadius: 999, height: "100%" },
  statsProgressLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 16 },
  statsProgressTrack: { backgroundColor: colors.surfaceSoft, borderRadius: 999, height: 9, marginTop: 10, overflow: "hidden" },
  statsProgressValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 52, letterSpacing: -1.5, lineHeight: 58 },
  statsSectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 23, lineHeight: 29 },
  statsTab: { alignItems: "center", borderCurve: "continuous", borderRadius: 13, flex: 1, justifyContent: "center", minHeight: 48 },
  statsTabActive: { backgroundColor: colors.surfaceSoft },
  statsTabPressed: { opacity: 0.62 },
  statsTabText: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15 },
  statsTabTextActive: { color: colors.primary, fontFamily: fonts.semibold },
  statsTabs: { borderColor: colors.border, borderCurve: "continuous", borderRadius: 14, borderWidth: 1, flexDirection: "row", padding: 2 },
  stickyFooter: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, left: 0, padding: 16, position: "absolute", right: 0 },
  swipeDelete: { alignItems: "center", backgroundColor: colors.danger, justifyContent: "center", marginVertical: 1, width: 76 },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 999, height: 8, width: 8 },
});
