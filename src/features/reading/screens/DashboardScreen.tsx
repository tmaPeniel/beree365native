import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, Check, Heart, Share2, Trash2, X } from "lucide-react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useVerseLikes } from "@/features/profile/hooks/useVerseLikes";
import { useDateService } from "@/features/reading/hooks/useDateService";
import { usePlanDuration } from "@/features/reading/hooks/usePlanDuration";
import {
  getDailyVerse,
  getOverallProgress,
  getUserProgressForDay,
  toggleChapterStatus,
} from "@/features/reading/services/readingPlan";
import { supabase } from "@/integrations/supabase/client";
import { MotionView, PressableScale } from "@/shared/animation/Motion";
import { colors, fonts } from "@/shared/theme/styles";

const FALLBACK_QUOTE = "La Parole de Dieu éclaire chacun de nos pas.";
type DayProgress = Awaited<ReturnType<typeof getUserProgressForDay>>;
type NotificationLog = {
  body?: string | null;
  created_at?: string | null;
  id: string;
  is_read?: boolean | null;
  link?: string | null;
  message?: string | null;
  metadata?: { href?: string; link?: string } | null;
  notification_type?: string | null;
  read_at?: string | null;
  sent_at?: string | null;
  title?: string | null;
  type?: string | null;
};

function formatFrenchDate(dateValue: string) {
  const parts = dateValue.split("-").map(Number);
  const date =
    parts.length === 3 && parts.every(Number.isFinite)
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date();

  return format(date, "EEEE d MMMM yyyy", { locale: fr }).replace(
    /(^|\s)(\p{L})/gu,
    (_, space: string, letter: string) => `${space}${letter.toUpperCase()}`
  );
}

function formatShortDate(date: Date) {
  return format(date, "dd/MM/yyyy", { locale: fr });
}

function formatNotificationTime(value?: string | null) {
  if (!value) return "A l'instant";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A l'instant";

  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

function getPlanDates(startDateValue: string, duration: number) {
  const [year, month, day] = startDateValue.split("-").map(Number);
  const startDate = new Date(year, month - 1, day);
  const safeStartDate = Number.isNaN(startDate.getTime()) ? new Date() : startDate;
  const endDate = new Date(safeStartDate);
  endDate.setDate(endDate.getDate() + Math.max(duration - 1, 0));
  return { startDate: safeStartDate, endDate };
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "Utilisateur";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function DashboardScreen() {
  const queryClient = useQueryClient();
  const { user, profile, isLoading, triggerProgressUpdate } = useAuth();
  const { currentDayNumber, getDateForCurrentDay } = useDateService();
  const { planDuration } = usePlanDuration();
  const verseLikes = useVerseLikes(currentDayNumber);
  const [pendingChapterId, setPendingChapterId] = useState<string | null>(null);
  const [notificationSheetVisible, setNotificationSheetVisible] = useState(false);

  const verseQuery = useQuery({
    queryKey: ["mobile-verse", currentDayNumber],
    queryFn: () => getDailyVerse(currentDayNumber),
    enabled: currentDayNumber > 0,
  });

  const chaptersQuery = useQuery({
    queryKey: ["mobile-day-progress", user?.id, currentDayNumber],
    queryFn: () => getUserProgressForDay(user!.id, currentDayNumber),
    enabled: !!user?.id && currentDayNumber > 0,
  });

  const progressQuery = useQuery({
    queryKey: ["mobile-progress", user?.id],
    queryFn: () => getOverallProgress(user!.id),
    enabled: !!user?.id,
  });

  const notificationsQuery = useQuery({
    queryKey: ["mobile-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("notification_logs")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_deleted", false)
        .order("sent_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as NotificationLog[];
    },
    enabled: !!user?.id,
  });

  const toggleChapter = async (chapterId: string, status: "pending" | "completed") => {
    if (!user?.id || pendingChapterId) return;

    const queryKey = ["mobile-day-progress", user.id, currentDayNumber] as const;
    const previousProgress = queryClient.getQueryData<DayProgress>(queryKey);
    const nextStatus = status === "completed" ? "pending" : "completed";

    setPendingChapterId(chapterId);
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
      await queryClient.invalidateQueries({ queryKey: ["mobile-progress", user.id] });
    } catch (error: any) {
      queryClient.setQueryData(queryKey, previousProgress);
      Alert.alert("Progression", error.message || "Impossible de modifier ce passage.");
    } finally {
      setPendingChapterId(null);
    }
  };

  if (isLoading || !profile) {
    return (
      <View style={dashboardStyles.loadingScreen}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const verse = verseQuery.data;
  const verseText = verse?.text?.trim();
  const wisdomType = verse?.wisdomType?.trim();
  const quote = verseText || wisdomType || FALLBACK_QUOTE;
  const wisdomLabel = verseText && wisdomType ? wisdomType : "Sagesse biblique";
  const reference = verse?.reference?.trim() || "Bérée 365";
  const displayName = profile.full_name?.trim() || "Utilisateur";
  const displayDate = formatFrenchDate(getDateForCurrentDay());
  const chapters = chaptersQuery.data ?? [];
  const progress = progressQuery.data ?? {
    totalPassages: 0,
    passagesRead: 0,
    passagesRemaining: 0,
    progressPercentage: 0,
    completedDays: 0,
  };
  const planDates = getPlanDates(profile.start_date, planDuration);
  const daysRemaining = Math.max(planDuration - currentDayNumber, 0);
  const isRefreshing = verseQuery.isRefetching || chaptersQuery.isRefetching || progressQuery.isRefetching;
  const profileInitials = getInitials(profile.full_name, user?.email);
  const unreadNotifications = (notificationsQuery.data || []).filter((item) => !item.is_read && !item.read_at).length;

  const refreshDashboard = () => {
    void Promise.all([verseQuery.refetch(), chaptersQuery.refetch(), progressQuery.refetch()]);
  };

  const shareVerse = async () => {
    await Share.share({
      message: `“${quote}”\n\n${reference}\nBérée 365`,
      title: "Sagesse du jour",
    });
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!user?.id) return;

    await (supabase as any)
      .from("notification_logs")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    await queryClient.invalidateQueries({ queryKey: ["mobile-notifications", user.id] });
  };

  const markAllNotificationsRead = async () => {
    if (!user?.id || unreadNotifications === 0) return;

    await (supabase as any)
      .from("notification_logs")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_deleted", false);

    await queryClient.invalidateQueries({ queryKey: ["mobile-notifications", user.id] });
  };

  const removeNotification = async (notificationId: string) => {
    if (!user?.id) return;

    const queryKey = ["mobile-notifications", user.id] as const;
    const previousNotifications = queryClient.getQueryData<NotificationLog[]>(queryKey);

    queryClient.setQueryData<NotificationLog[]>(queryKey, (current) =>
      current?.filter((item) => item.id !== notificationId) || []
    );

    const { error } = await (supabase as any)
      .from("notification_logs")
      .update({ is_deleted: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      queryClient.setQueryData(queryKey, previousNotifications);
      Alert.alert("Notifications", "Impossible de supprimer cette notification.");
    }
  };

  const openNotification = async (notification: NotificationLog) => {
    const href = notification.link || notification.metadata?.href || notification.metadata?.link;
    await markNotificationRead(notification.id);

    if (href) {
      setNotificationSheetVisible(false);
      router.push(href as any);
    }
  };

  return (
    <View style={dashboardStyles.safeArea}>
      <ScrollView
        contentContainerStyle={dashboardStyles.content}
        refreshControl={(
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={refreshDashboard}
            refreshing={isRefreshing}
            tintColor={colors.primary}
          />
        )}
        showsVerticalScrollIndicator={false}
        style={dashboardStyles.screen}
      >
        <MotionView style={dashboardStyles.brandHeader}>
          <View style={dashboardStyles.headerWelcome}>
            <Text maxFontSizeMultiplier={1.25} numberOfLines={2} style={dashboardStyles.headerWelcomeText}>
              Bienvenue, {displayName}
            </Text>
          </View>

          <View style={dashboardStyles.headerActions}>
            <PressableScale
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                setNotificationSheetVisible(true);
                void notificationsQuery.refetch();
              }}
              style={({ pressed }) => [
                dashboardStyles.headerIconButton,
                pressed && dashboardStyles.headerButtonPressed,
              ]}
            >
              <Bell color={colors.text} size={20} strokeWidth={1.9} />
              {unreadNotifications > 0 ? (
                <View style={dashboardStyles.notificationDot}>
                  <Text style={dashboardStyles.notificationDotText}>
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </Text>
                </View>
              ) : null}
            </PressableScale>

            <PressableScale
              accessibilityLabel="Profil"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [
                dashboardStyles.profileBadge,
                pressed && dashboardStyles.headerButtonPressed,
              ]}
            >
              <Text style={dashboardStyles.profileBadgeText}>{profileInitials}</Text>
            </PressableScale>
          </View>
        </MotionView>

        <MotionView delay={70} style={dashboardStyles.welcomeBlock}>
          <Text maxFontSizeMultiplier={1.3} style={dashboardStyles.todayText}>
            Aujourd'hui c'est le
          </Text>
          <Text maxFontSizeMultiplier={1.25} style={dashboardStyles.dayText}>
            JOUR <Text style={dashboardStyles.dayNumber}>{currentDayNumber}</Text>
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={dashboardStyles.dateText}>
            {displayDate}
          </Text>
        </MotionView>

        <MotionView delay={140}>
          <LinearGradient
            colors={["#5C285E", "#B94E61", "#EA936A", "#F3C784"]}
            end={{ x: 0.5, y: 1 }}
            locations={[0, 0.42, 0.72, 1]}
            start={{ x: 0.5, y: 0 }}
            style={dashboardStyles.wisdomCard}
          >
          <View>
            <Text maxFontSizeMultiplier={1.25} style={dashboardStyles.wisdomEyebrow}>
              SAGESSE DU JOUR
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={dashboardStyles.referenceText}>
              {reference}
            </Text>
          </View>

          <View style={dashboardStyles.quoteArea}>
            {verseQuery.isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <View style={dashboardStyles.wisdomBadge}>
                  <Text maxFontSizeMultiplier={1.2} style={dashboardStyles.wisdomBadgeText}>
                    {wisdomLabel}
                  </Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={dashboardStyles.quoteText}>
                  “{quote}”
                </Text>
              </>
            )}
          </View>

          <View style={dashboardStyles.actionBar}>
            <PressableScale
              accessibilityLabel={verseLikes.hasLiked ? "Retirer le J'aime" : "J'aime"}
              disabled={verseLikes.isLoading}
              hitSlop={10}
              onPress={verseLikes.toggleLike}
              style={({ pressed }) => [
                dashboardStyles.actionButton,
                pressed && dashboardStyles.actionPressed,
              ]}
            >
              <Heart
                color="#FFFFFF"
                fill={verseLikes.hasLiked ? "#FFFFFF" : "transparent"}
                size={23}
                strokeWidth={1.8}
              />
              <Text maxFontSizeMultiplier={1.2} style={dashboardStyles.actionText}>
                {verseLikes.likesCount}
              </Text>
            </PressableScale>

            <PressableScale
              accessibilityLabel="Partager la sagesse du jour"
              hitSlop={10}
              onPress={shareVerse}
              style={({ pressed }) => [
                dashboardStyles.actionButton,
                pressed && dashboardStyles.actionPressed,
              ]}
            >
              <Share2 color="#FFFFFF" size={20} strokeWidth={1.8} />
              <Text maxFontSizeMultiplier={1.2} style={dashboardStyles.actionText}>
                Partager
              </Text>
            </PressableScale>
          </View>
          </LinearGradient>
        </MotionView>

        <MotionView delay={210} style={dashboardStyles.passagesCard}>
          <Text maxFontSizeMultiplier={1.3} style={dashboardStyles.passagesTitle}>
            Passages du jour
          </Text>

          {chaptersQuery.isLoading ? (
            <ActivityIndicator color={colors.primary} style={dashboardStyles.passagesLoader} />
          ) : chaptersQuery.isError ? (
            <Text style={dashboardStyles.emptyText}>Impossible de charger les passages.</Text>
          ) : chapters.length === 0 ? (
            <Text style={dashboardStyles.emptyText}>Aucun passage prévu aujourd'hui.</Text>
          ) : (
            <View style={dashboardStyles.passagesList}>
              {chapters.map((item) => {
                const chapter = item.reading_plan_chapters;
                const done = item.status === "completed";
                const isPending = pendingChapterId === chapter.id;

                return (
                  <PressableScale
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: done, disabled: !!pendingChapterId }}
                    disabled={!!pendingChapterId}
                    key={chapter.id}
                    onPress={() => toggleChapter(chapter.id, item.status)}
                    style={({ pressed }) => [
                      dashboardStyles.passageRow,
                      pressed && dashboardStyles.passagePressed,
                    ]}
                  >
                    <View style={[dashboardStyles.checkbox, done && dashboardStyles.checkboxDone]}>
                      {isPending ? (
                        <ActivityIndicator color={done ? "#FFFFFF" : colors.primary} size="small" />
                      ) : done ? (
                        <Check color="#FFFFFF" size={14} strokeWidth={3} />
                      ) : null}
                    </View>
                    <View style={dashboardStyles.passageCopy}>
                      <Text
                        maxFontSizeMultiplier={1.35}
                        style={[dashboardStyles.passageReference, done && dashboardStyles.passageDone]}
                      >
                        {chapter.reference}
                      </Text>
                      {!!chapter.description && (
                        <Text maxFontSizeMultiplier={1.35} style={dashboardStyles.passageDescription}>
                          {chapter.description}
                        </Text>
                      )}
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          )}
        </MotionView>

        <ProgressCard
          isLoading={progressQuery.isLoading}
          passagesRead={progress.passagesRead}
          passagesRemaining={progress.passagesRemaining}
          percentage={progress.progressPercentage}
          totalPassages={progress.totalPassages}
        />

        <MotionView delay={350} style={dashboardStyles.datesCard}>
          <View style={dashboardStyles.dateTile}>
            <Text style={dashboardStyles.dateTileLabel}>Date de début</Text>
            <Text style={dashboardStyles.dateTileValue}>{formatShortDate(planDates.startDate)}</Text>
          </View>
          <View style={dashboardStyles.dateTile}>
            <Text style={dashboardStyles.dateTileLabel}>Date de fin</Text>
            <Text style={dashboardStyles.dateTileValue}>{formatShortDate(planDates.endDate)}</Text>
          </View>
          <View style={[dashboardStyles.dateTile, dashboardStyles.remainingTile]}>
            <Text style={dashboardStyles.remainingLabel}>Jours restants</Text>
            <Text style={dashboardStyles.dateTileValue}>{daysRemaining} jours</Text>
          </View>
        </MotionView>
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => setNotificationSheetVisible(false)}
        transparent
        visible={notificationSheetVisible}
      >
        <Pressable
          accessibilityLabel="Fermer les notifications"
          accessibilityRole="button"
          onPress={() => setNotificationSheetVisible(false)}
          style={dashboardStyles.notificationBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={dashboardStyles.notificationSheet}
          >
            <View style={dashboardStyles.notificationSheetHandle} />
            <View style={dashboardStyles.notificationSheetHeader}>
              <View>
                <Text style={dashboardStyles.notificationSheetTitle}>Notifications</Text>
                <Text style={dashboardStyles.notificationSheetSubtitle}>
                  {unreadNotifications > 0
                    ? `${unreadNotifications} nouvelle${unreadNotifications > 1 ? "s" : ""}`
                    : "Tout est a jour"}
                </Text>
              </View>
              <View style={dashboardStyles.notificationHeaderActions}>
                {unreadNotifications > 0 ? (
                  <PressableScale
                    accessibilityLabel="Marquer toutes les notifications comme lues"
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={markAllNotificationsRead}
                    style={({ pressed }) => [
                      dashboardStyles.markReadButton,
                      pressed && dashboardStyles.headerButtonPressed,
                    ]}
                  >
                    <Check color={colors.primary} size={18} strokeWidth={2.2} />
                  </PressableScale>
                ) : null}
                <PressableScale
                  accessibilityLabel="Fermer"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setNotificationSheetVisible(false)}
                  style={({ pressed }) => [
                    dashboardStyles.closeSheetButton,
                    pressed && dashboardStyles.headerButtonPressed,
                  ]}
                >
                  <X color={colors.text} size={19} strokeWidth={2.1} />
                </PressableScale>
              </View>
            </View>

            <ScrollView
              contentContainerStyle={dashboardStyles.notificationList}
              showsVerticalScrollIndicator={false}
            >
              {notificationsQuery.isLoading ? (
                <ActivityIndicator color={colors.primary} style={dashboardStyles.notificationLoader} />
              ) : notificationsQuery.isError ? (
                <Text style={dashboardStyles.emptyText}>Impossible de charger les notifications.</Text>
              ) : notificationsQuery.data?.length ? (
                notificationsQuery.data.map((notification) => (
                  <NotificationSheetRow
                    item={notification}
                    key={notification.id}
                    onOpen={() => openNotification(notification)}
                    onRemove={() => removeNotification(notification.id)}
                  />
                ))
              ) : (
                <View style={dashboardStyles.notificationEmptyState}>
                  <Bell color={colors.primary} size={24} strokeWidth={1.8} />
                  <Text style={dashboardStyles.notificationEmptyTitle}>Aucune notification</Text>
                  <Text style={dashboardStyles.notificationEmptyText}>
                    Vos rappels, badges et versets apparaitront ici.
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function NotificationSheetRow({
  item,
  onOpen,
  onRemove,
}: {
  item: NotificationLog;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const isUnread = !item.is_read && !item.read_at;
  const title = item.title || item.notification_type || item.type || "Notification";
  const body = item.body || item.message || "Notification Beree 365";
  const time = formatNotificationTime(item.sent_at || item.created_at);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        dashboardStyles.notificationRow,
        isUnread && dashboardStyles.notificationRowUnread,
        pressed && dashboardStyles.notificationRowPressed,
      ]}
    >
      <View style={dashboardStyles.notificationAvatar}>
        <Bell color={colors.primary} size={17} strokeWidth={2} />
      </View>
      <View style={dashboardStyles.notificationCopy}>
        <View style={dashboardStyles.notificationTitleRow}>
          <Text numberOfLines={1} style={dashboardStyles.notificationRowTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={dashboardStyles.notificationTime}>
            {time}
          </Text>
        </View>
        <Text numberOfLines={2} style={dashboardStyles.notificationBody}>
          {body}
        </Text>
      </View>
      {isUnread ? <View style={dashboardStyles.unreadDot} /> : null}
      <PressableScale
        accessibilityLabel="Supprimer la notification"
        accessibilityRole="button"
        hitSlop={8}
        onPress={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        style={({ pressed }) => [
          dashboardStyles.notificationDeleteButton,
          pressed && dashboardStyles.headerButtonPressed,
        ]}
      >
        <Trash2 color={colors.danger} size={17} strokeWidth={1.9} />
      </PressableScale>
    </Pressable>
  );
}

type ProgressCardProps = {
  isLoading: boolean;
  passagesRead: number;
  passagesRemaining: number;
  percentage: number;
  totalPassages: number;
};

function ProgressCard({
  isLoading,
  passagesRead,
  passagesRemaining,
  percentage,
  totalPassages,
}: ProgressCardProps) {
  const size = 108;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));
  const dashOffset = circumference * (1 - clampedPercentage / 100);

  return (
    <MotionView delay={280} style={dashboardStyles.progressCard}>
      <Text style={dashboardStyles.progressTitle}>PROGRESSION GLOBALE</Text>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 44 }} />
      ) : (
        <>
          <View style={dashboardStyles.metricsList}>
            <MetricRow label="Total de Passages à lire" value={totalPassages} />
            <MetricRow label="Total de Passages lus" value={passagesRead} />
            <MetricRow label="Total Passages restants" value={passagesRemaining} />
          </View>
          <View style={dashboardStyles.progressCircleWrap}>
            <Svg height={size} width={size}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                fill="transparent"
                r={radius}
                stroke="#E7E7E7"
                strokeWidth={strokeWidth}
              />
              <Circle
                cx={size / 2}
                cy={size / 2}
                fill="transparent"
                r={radius}
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
                stroke={colors.primary}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
              />
            </Svg>
            <Text style={dashboardStyles.progressPercentage}>{Math.round(clampedPercentage)}%</Text>
          </View>
          <View style={dashboardStyles.legend}>
            <View style={dashboardStyles.legendItem}>
              <View style={[dashboardStyles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={dashboardStyles.legendText}>Passages Lus</Text>
            </View>
            <View style={dashboardStyles.legendItem}>
              <View style={[dashboardStyles.legendDot, { backgroundColor: "#7B6D61" }]} />
              <Text style={dashboardStyles.legendText}>Restants</Text>
            </View>
          </View>
        </>
      )}
    </MotionView>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={dashboardStyles.metricRow}>
      <Text style={dashboardStyles.metricLabel}>{label}</Text>
      <Text style={dashboardStyles.metricValue}>{value}</Text>
    </View>
  );
}

const dashboardStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.surface,
    flex: 1,
  },
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center",
  },
  content: {
    gap: 14,
    paddingBottom: 118,
    paddingHorizontal: 16,
  },
  brandHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 54,
  },
  headerWelcome: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  headerWelcomeText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerIconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  headerButtonPressed: {
    opacity: 0.72,
  },
  notificationDot: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 3,
    position: "absolute",
    right: 5,
    top: 4,
  },
  notificationDotText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 9,
    lineHeight: 12,
  },
  profileBadge: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderColor: "#F4D7BE",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  profileBadgeText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0,
  },
  welcomeBlock: {
    paddingBottom: 1,
    paddingTop: 2,
  },
  todayText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  dayText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 29,
    textAlign: "center",
  },
  dayNumber: {
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  dateText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  wisdomCard: {
    borderRadius: 16,
    elevation: 5,
    minHeight: 342,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 16,
    shadowColor: "#5C285E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.17,
    shadowRadius: 9,
  },
  wisdomEyebrow: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 19,
  },
  referenceText: {
    color: "#FFFFFF",
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 1,
  },
  quoteArea: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 9,
    paddingVertical: 18,
  },
  wisdomBadge: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 14,
    marginBottom: 15,
    maxWidth: "100%",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  wisdomBadgeText: {
    color: "#FFFFFF",
    fontFamily: fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  quoteText: {
    color: "#FFFFFF",
    fontFamily: fonts.boldItalic,
    fontSize: 16,
    lineHeight: 27,
    textAlign: "center",
  },
  actionBar: {
    alignItems: "center",
    borderTopColor: "rgba(255,255,255,0.18)",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
    marginHorizontal: -18,
    minHeight: 51,
  },
  actionButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 44,
    paddingHorizontal: 4,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    color: "#FFFFFF",
    fontFamily: fonts.semibold,
    fontSize: 12,
    lineHeight: 17,
  },
  passagesCard: {
    backgroundColor: colors.surface,
    borderColor: "#F2ECE7",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    paddingBottom: 12,
    paddingHorizontal: 17,
    paddingTop: 16,
    shadowColor: "#5A4638",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
  },
  passagesTitle: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 11,
    textAlign: "center",
  },
  passagesLoader: {
    marginVertical: 18,
  },
  passagesList: {
    gap: 1,
  },
  passageRow: {
    alignItems: "flex-start",
    borderRadius: 8,
    flexDirection: "row",
    gap: 11,
    minHeight: 43,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  passagePressed: {
    backgroundColor: colors.surfaceSoft,
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#DEBFAE",
    borderRadius: 4,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    marginTop: 1,
    width: 18,
  },
  checkboxDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  passageCopy: {
    flex: 1,
  },
  passageReference: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  passageDescription: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  passageDone: {
    color: colors.muted,
    textDecorationLine: "line-through",
  },
  progressCard: {
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderColor: "#F2ECE7",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    padding: 14,
    shadowColor: "#5A4638",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
  },
  progressTitle: {
    backgroundColor: "#F8F4F1",
    borderRadius: 12,
    color: colors.primary,
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    paddingVertical: 8,
    textAlign: "center",
  },
  metricsList: {
    gap: 7,
  },
  metricRow: {
    alignItems: "center",
    backgroundColor: "#F8F6F3",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 34,
    paddingHorizontal: 8,
  },
  metricLabel: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  progressCircleWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 108,
    justifyContent: "center",
    marginTop: 14,
    width: 108,
  },
  progressPercentage: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 25,
    position: "absolute",
  },
  legend: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    justifyContent: "center",
    marginTop: 10,
  },
  legendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  legendDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 9,
  },
  datesCard: {
    backgroundColor: colors.surface,
    borderColor: "#F2ECE7",
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 20,
    shadowColor: "#5A4638",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 9,
  },
  dateTile: {
    backgroundColor: "#F7EDE8",
    borderRadius: 3,
    flexBasis: "46%",
    flexGrow: 1,
    gap: 5,
    minHeight: 61,
    padding: 11,
  },
  remainingTile: {
    backgroundColor: "#FBF4E7",
    flexBasis: "100%",
  },
  dateTileLabel: {
    color: colors.primary,
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  remainingLabel: {
    color: "#D98A19",
    fontFamily: fonts.regular,
    fontSize: 11,
  },
  dateTileValue: {
    color: colors.text,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  notificationBackdrop: {
    backgroundColor: "rgba(25, 19, 14, 0.42)",
    flex: 1,
    justifyContent: "flex-end",
  },
  notificationSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "82%",
    minHeight: 360,
    paddingBottom: 26,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  notificationSheetHandle: {
    alignSelf: "center",
    backgroundColor: "#D7CCC3",
    borderRadius: 999,
    height: 4,
    marginBottom: 16,
    width: 42,
  },
  notificationSheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  notificationSheetTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
  },
  notificationSheetSubtitle: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  notificationHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  markReadButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  closeSheetButton: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  notificationList: {
    gap: 8,
    paddingBottom: 18,
  },
  notificationLoader: {
    marginVertical: 44,
  },
  notificationRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 76,
    padding: 11,
  },
  notificationRowUnread: {
    backgroundColor: "#FFF8F1",
    borderColor: "#F3D7C6",
  },
  notificationRowPressed: {
    opacity: 0.74,
  },
  notificationAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  notificationRowTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    maxWidth: 92,
  },
  notificationBody: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  unreadDot: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  notificationDeleteButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  notificationEmptyState: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 44,
  },
  notificationEmptyTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    marginTop: 4,
  },
  notificationEmptyText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyText: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 15,
    textAlign: "center",
  },
});
