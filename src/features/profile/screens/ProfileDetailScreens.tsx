import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { router, usePathname } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";
import {
  Award,
  Bell,
  BookOpen,
  Camera,
  ChevronLeft,
  CalendarClock,
  ChevronRight,
  Crown,
  Gift,
  Image as ImageIcon,
  Info,
  Lock,
  Mail,
  Megaphone,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { updateUserProfile } from "@/features/auth/services/auth";
import { getProfileInitials, ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { removeProfileAvatar, uploadProfileAvatar } from "@/features/profile/services/avatar-service";
import {
  Badge,
  getAllBadges,
  getBadgeProgress,
  getUserBadges,
  UserBadge,
} from "@/features/profile/services/badgeService";
import { usePremium } from "@/features/profile/hooks/usePremium";
import { usePushNotifications } from "@/features/profile/hooks/usePushNotifications";
import {
  getOverallProgress,
  getUserReadingPlanProgress,
} from "@/features/reading/services/readingPlan";
import { getUserPlan } from "@/features/reading/services/readingPlan/planService";
import { MotionView, PressableScale } from "@/shared/animation/Motion";
import { colors, fonts, styles } from "@/shared/theme/styles";

type Period = "7j" | "30j" | "Tout";
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
  return date.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string) {
  return Math.round((new Date(`${a}T00:00:00.000Z`).getTime() - new Date(`${b}T00:00:00.000Z`).getTime()) / 86400000);
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

function chartData(counts: Map<string, number>, period: Period) {
  const total = period === "7j" ? 7 : period === "30j" ? 30 : 90;
  const today = new Date();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (total - 1 - index));
    const key = dateKey(date);
    return { key, value: counts.get(key) || 0 };
  });
}

function ActivityChart({ data }: { data: { key: string; value: number }[] }) {
  const width = 300;
  const height = 126;
  const padding = 12;
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data
    .map((item, index) => {
      const x = padding + (data.length <= 1 ? 0 : (index / (data.length - 1)) * (width - padding * 2));
      const y = padding + (height - padding * 2) - (item.value / max) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <Svg height={height} viewBox={`0 0 ${width} ${height}`} width="100%">
      <Rect fill="#FAF7F2" height={height} rx={16} width={width} />
      <Polyline fill="none" points={points} stroke={colors.primary} strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
    </Svg>
  );
}

function CircularProgress({ completed, total }: { completed: number; total: number }) {
  const size = 170;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.min(completed / total, 1) : 0;
  return (
    <View style={s.progressWrap}>
      <Svg height={size} width={size}>
        <Circle cx={size / 2} cy={size / 2} fill="transparent" r={radius} stroke={colors.surfaceSoft} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={colors.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - progress * circumference}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={s.progressCenter}>
        <Text style={s.progressValue}>{completed}</Text>
        <Text style={s.progressLabel}>/ {total} jours</Text>
      </View>
    </View>
  );
}

export function StatisticsScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("7j");
  const progressQuery = useQuery({ queryKey: ["mobile-stats", user?.id], queryFn: () => getOverallProgress(user.id), enabled: !!user?.id });
  const planQuery = useQuery({ queryKey: ["mobile-current-plan", user?.id], queryFn: () => getUserPlan(user.id), enabled: !!user?.id });
  const activityQuery = useQuery({ queryKey: ["mobile-profile-activity", user?.id], queryFn: () => getUserReadingPlanProgress(user.id), enabled: !!user?.id });
  const activity = useMemo(() => computeActivity(activityQuery.data || []), [activityQuery.data]);
  const data = useMemo(() => chartData(activity.counts, period), [activity.counts, period]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Statistiques" subtitle="Votre progression de lecture." />
      <View style={[s.card, s.center]}><CircularProgress completed={progressQuery.data?.completedDays ?? 0} total={planQuery.data?.duration_days ?? 365} /></View>
      <View style={s.card}>
        <View style={s.rowBetween}>
          <Text style={s.sectionTitle}>Activite</Text>
          <View style={s.chipRow}>{(["7j", "30j", "Tout"] as Period[]).map((item) => <Chip active={period === item} key={item} label={item} onPress={() => setPeriod(item)} />)}</View>
        </View>
        <ActivityChart data={data} />
      </View>
      <View style={s.statsGrid}>
        <StatCard label="Streak actuel" value={activity.currentStreak} />
        <StatCard label="Streak max" value={activity.maxStreak} />
        <StatCard label="Chapitres lus" value={activity.chaptersRead || progressQuery.data?.passagesRead || 0} />
        <StatCard label="Jours actifs" value={activity.activeDays} />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <View style={s.statCard}><Text style={s.statValue}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>;
}

export function BadgesScreen() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<BadgeGridItem | null>(null);
  const allQuery = useQuery({ queryKey: ["mobile-all-badges"], queryFn: getAllBadges });
  const userQuery = useQuery({ queryKey: ["mobile-user-badges", user?.id], queryFn: () => getUserBadges(user.id), enabled: !!user?.id });
  const progressQuery = useQuery({ queryKey: ["mobile-badge-progress", user?.id], queryFn: () => getBadgeProgress(user.id), enabled: !!user?.id });
  const items = useMemo(() => {
    const unlocked = new Map((userQuery.data || []).map((item) => [item.badge_id, item]));
    const progress = new Map((progressQuery.data || []).map((item) => [item.badge.id, item]));
    return (allQuery.data || []).map((badge) => ({ badge, current: progress.get(badge.id)?.current, progress: progress.get(badge.id)?.progress, required: progress.get(badge.id)?.required, unlocked: unlocked.get(badge.id) }));
  }, [allQuery.data, progressQuery.data, userQuery.data]);
  return (
    <View style={styles.screen}>
      <FlatList
        ListHeaderComponent={<Header title="Badges" subtitle={`${userQuery.data?.length ?? 0}/${allQuery.data?.length ?? 0} recompenses debloquees.`} />}
        columnWrapperStyle={s.badgeRow}
        contentContainerStyle={s.content}
        data={items}
        keyExtractor={(item) => item.badge.id}
        numColumns={3}
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

function BadgeTile({ item, onPress }: { item: BadgeGridItem; onPress: () => void }) {
  const locked = !item.unlocked;
  return (
    <Pressable onPress={onPress} style={s.badgeTile}>
      <View style={[s.badgeIcon, locked && s.faded]}>
        <Text style={s.badgeEmoji}>{item.badge.icon || "🏅"}</Text>
        {locked ? <View style={s.lockBadge}><Lock color={colors.muted} size={13} /></View> : null}
      </View>
      <Text numberOfLines={2} style={[s.badgeName, locked && s.muted]}>{item.badge.name}</Text>
    </Pressable>
  );
}

function BadgeDetails({ item }: { item: BadgeGridItem }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={[s.badgeIconLarge, !item.unlocked && s.faded]}><Text style={s.badgeEmojiLarge}>{item.badge.icon || "🏅"}</Text></View>
      <Text style={s.modalTitle}>{item.badge.name}</Text>
      <Text style={styles.subheading}>{item.badge.description}</Text>
      <Text style={s.detail}>{item.unlocked ? `Obtenu le ${formatDate(item.unlocked.unlocked_at)}` : `Condition : ${item.current ?? 0}/${item.required ?? "?"} (${item.progress ?? 0}%)`}</Text>
    </View>
  );
}

export function NotificationsScreen() {
  const { user } = useAuth();
  const push = usePushNotifications();
  const [prefs, setPrefs] = useState({ badges: true, dailyReminder: true, dailyVerse: true });
  const [times, setTimes] = useState({ dailyReminder: "08:00", dailyVerse: "07:00" });
  useEffect(() => {
    void push.refresh();
    void AsyncStorage.getItem("profile-notification-preferences").then((value) => {
      if (!value) return;
      const parsed = JSON.parse(value);
      if (parsed.preferences) setPrefs(parsed.preferences);
      if (parsed.times) setTimes(parsed.times);
    });
  }, []);
  const persist = async (nextPrefs = prefs, nextTimes = times) => AsyncStorage.setItem("profile-notification-preferences", JSON.stringify({ preferences: nextPrefs, times: nextTimes }));
  const devicesQuery = useQuery({ queryKey: ["mobile-devices", user?.id], queryFn: async () => ((await (supabase as any).from("user_devices").select("*").eq("user_id", user.id)).data || []), enabled: !!user?.id });
  const logsQuery = useQuery({ queryKey: ["mobile-notifications", user?.id], queryFn: async () => ((await (supabase as any).from("notification_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(25)).data || []), enabled: !!user?.id });
  const activatePush = async () => {
    try {
      const ok = await push.subscribe();
      Alert.alert("Notifications", ok ? "Les notifications sont activees." : "Autorisation refusee ou appareil non compatible.");
    } catch (error: any) {
      Alert.alert("Notifications", error.message ?? "Configuration push a finaliser.");
    }
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <Header title="Notifications" subtitle="Rappels, versets, badges et centre de notifications." />
      <View style={s.card}><PreferenceRow icon={Bell} label="Activer les notifications push" onChange={activatePush} value={push.permission === "granted"} /><Text style={styles.subheading}>Statut : {push.permission}</Text></View>
      <View style={s.card}>
        <PreferenceRow icon={CalendarClock} label="Rappel quotidien" onChange={() => { const next = { ...prefs, dailyReminder: !prefs.dailyReminder }; setPrefs(next); void persist(next, times); }} value={prefs.dailyReminder} />
        <TimePicker value={times.dailyReminder} onChange={(value) => { const next = { ...times, dailyReminder: value }; setTimes(next); void persist(prefs, next); }} />
        <PreferenceRow icon={BookOpen} label="Verset du jour" onChange={() => { const next = { ...prefs, dailyVerse: !prefs.dailyVerse }; setPrefs(next); void persist(next, times); }} value={prefs.dailyVerse} />
        <TimePicker value={times.dailyVerse} onChange={(value) => { const next = { ...times, dailyVerse: value }; setTimes(next); void persist(prefs, next); }} />
        <PreferenceRow icon={Award} label="Badges" onChange={() => { const next = { ...prefs, badges: !prefs.badges }; setPrefs(next); void persist(next, times); }} value={prefs.badges} />
      </View>
      <View style={s.card}><Text style={s.sectionTitle}>Appareils connectes</Text>{devicesQuery.data?.length ? devicesQuery.data.map((device: any) => <Text key={device.id} style={styles.subheading}>{device.platform || device.device_platform || "Appareil"} - {formatDate(device.last_seen_at || device.created_at)}</Text>) : <Text style={styles.subheading}>Aucun appareil synchronise pour le moment.</Text>}</View>
      <View style={s.card}><Text style={s.sectionTitle}>Centre de notifications</Text>{logsQuery.data?.length ? logsQuery.data.map((item: any) => <NotificationRow key={item.id} item={item} />) : <Text style={styles.subheading}>Aucune notification recue.</Text>}</View>
    </ScrollView>
  );
}

function PreferenceRow({ icon: Icon, label, onChange, value }: { icon: IconType; label: string; onChange: () => void; value: boolean }) {
  return <View style={s.preferenceRow}><View style={s.rowLeft}><Icon color={colors.primary} size={20} /><Text style={s.rowTitle}>{label}</Text></View><Switch onValueChange={onChange} thumbColor="#FFFFFF" trackColor={{ false: colors.border, true: colors.primary }} value={value} /></View>;
}

function TimePicker({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false}>{timeOptions.map((item) => <Chip active={value === item} key={item} label={item} onPress={() => onChange(item)} />)}</ScrollView>;
}

function NotificationRow({ item }: { item: any }) {
  const href = item.link || item.metadata?.href || item.metadata?.link;
  const remove = () => void (supabase as any).from("notification_logs").delete().eq("id", item.id);

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable onPress={remove} style={s.swipeDelete}>
          <Trash2 color="#FFFFFF" size={18} />
        </Pressable>
      )}
    >
      <Pressable onPress={() => href && router.push(href as any)} style={s.notificationRow}>
        {!item.read_at ? <View style={s.unreadDot} /> : null}
        <View style={{ flex: 1 }}><Text style={s.rowTitle}>{item.title || item.type || "Notification"}</Text><Text style={styles.subheading}>{item.message || item.body || "Notification Beree 365"}</Text></View>
        <Pressable onPress={remove} style={s.deleteButton}><Trash2 color={colors.danger} size={18} /></Pressable>
      </Pressable>
    </Swipeable>
  );
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
  const [promo, setPromo] = useState("");
  const benefits = [["Plans enrichis", "Accedez aux parcours avances.", BookOpen], ["Statistiques completes", "Suivez vos streaks en profondeur.", Sparkles], ["Badges exclusifs", "Debloquez des recompenses supplementaires.", Award]] as const;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={s.content}>
      <View style={s.heroCard}><Crown color="#FFFFFF" size={34} /><Text style={s.heroTitle}>Beree Premium</Text><Text style={s.heroSubtitle}>Une experience plus complete pour accompagner votre lecture biblique.</Text></View>
      {benefits.map(([title, subtitle, Icon]) => <View key={title} style={s.benefitRow}><View style={s.roundIcon}><Icon color={colors.primary} size={20} /></View><View style={{ flex: 1 }}><Text style={s.rowTitle}>{title}</Text><Text style={styles.subheading}>{subtitle}</Text></View></View>)}
      <Pressable onPress={() => Alert.alert("Premium", "Le fournisseur de paiement reste a valider : RevenueCat ou in-app purchase Expo.")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Activer</Text></Pressable>
      <View style={s.card}><Text style={s.sectionTitle}>Code promo</Text><TextInput autoCapitalize="characters" onChangeText={setPromo} placeholder="CODEPROMO" placeholderTextColor={colors.muted} style={styles.input} value={promo} /><Pressable onPress={() => Alert.alert("Code promo", "La validation serveur du code promo reste a brancher.")} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Appliquer</Text></Pressable></View>
    </ScrollView>
  );
}

export function PrivacyScreen() {
  const { profile, user } = useAuth();
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const exportData = () => Share.share({ message: JSON.stringify({ exported_at: new Date().toISOString(), profile, user: { email: user?.email, id: user?.id } }, null, 2), title: "Export Beree 365" });
  const deleteAccount = () => Alert.alert("Supprimer mon compte", "Cette action est irreversible. Continuer ?", [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: async () => { const { error } = await supabase.functions.invoke("delete-user-account"); Alert.alert("Suppression", error ? error.message : "Demande de suppression envoyee."); } }]);
  return <ScrollView style={styles.screen} contentContainerStyle={s.content}><Header title="Confidentialite" subtitle="Controlez vos consentements et vos donnees." /><View style={s.card}><PreferenceRow icon={Shield} label="Analytics" onChange={() => setAnalytics(!analytics)} value={analytics} /><PreferenceRow icon={Megaphone} label="Marketing" onChange={() => setMarketing(!marketing)} value={marketing} /></View><Pressable onPress={exportData} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Exporter mes donnees</Text></Pressable><Pressable onPress={deleteAccount} style={[styles.secondaryButton, { borderColor: colors.danger }]}><Text style={[styles.secondaryButtonText, { color: colors.danger }]}>Supprimer mon compte</Text></Pressable></ScrollView>;
}

export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [startDate, setStartDate] = useState(profile?.start_date || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarOperation, setAvatarOperation] = useState<"upload" | "remove" | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const initials = getProfileInitials(fullName, user?.email);
  const isUpdatingAvatar = avatarOperation !== null;

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

  const save = async () => {
    if (!user?.id) return;
    if (fullName.trim().length < 2) return Alert.alert("Profil", "Le nom doit contenir au moins 2 caracteres.");
    setIsSaving(true);
    const result = await updateUserProfile(user.id, { full_name: fullName.trim(), start_date: startDate.trim() });
    setIsSaving(false);
    if (!result.success) return Alert.alert("Profil", result.error ?? "Impossible d'enregistrer le profil.");
    await refreshProfile();
    router.back();
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={s.content}>
        <Header
          title="Modifier le profil"
          subtitle="Mettez à jour vos informations personnelles."
        />

        <Pressable
          accessibilityLabel="Changer la photo de profil"
          accessibilityRole="button"
          disabled={isUpdatingAvatar}
          onPress={chooseAvatarSource}
          style={({ pressed }) => [
            s.avatarPicker,
            pressed && !isUpdatingAvatar && s.avatarPickerPressed,
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
          <View style={s.avatarPickerCopy}>
            <Text style={s.rowTitle}>
              {avatarOperation === "upload" ? "Envoi de la photo…" : "Changer la photo"}
            </Text>
            <Text style={styles.subheading}>Prendre une photo ou en choisir une dans la photothèque.</Text>
          </View>
        </Pressable>

        <View style={s.card}>
          <Text style={s.inputLabel}>Nom complet</Text>
          <TextInput
            onChangeText={setFullName}
            placeholder="Votre nom"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={fullName}
          />
          <Text style={s.inputLabel}>Date de début</Text>
          <TextInput
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={styles.input}
            value={startDate}
          />
        </View>
      </ScrollView>

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
          disabled={isSaving || isUpdatingAvatar}
          onPress={save}
          style={[styles.primaryButton, (isSaving || isUpdatingAvatar) && s.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Text>
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
  avatarPreviewWrap: { position: "relative" },
  badgeEmoji: { fontSize: 26 },
  badgeEmojiLarge: { fontSize: 40 },
  badgeIcon: { alignItems: "center", backgroundColor: colors.surfaceSoft, borderRadius: 24, height: 58, justifyContent: "center", width: 58 },
  badgeIconLarge: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surfaceSoft, borderRadius: 42, height: 84, justifyContent: "center", width: 84 },
  badgeName: { color: colors.text, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, textAlign: "center" },
  badgeRow: { gap: 10 },
  badgeTile: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flex: 1, gap: 8, marginBottom: 10, minHeight: 122, padding: 10 },
  backButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 999, borderWidth: 1, height: 40, justifyContent: "center", width: 40 },
  backButtonPressed: { backgroundColor: colors.surfaceSoft },
  benefitRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 14, padding: 16 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, gap: 12, padding: 16 },
  center: { alignItems: "center" },
  chip: { borderColor: colors.border, borderRadius: 999, borderWidth: 1, marginRight: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipText: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 12 },
  content: { gap: 16, padding: 20, paddingBottom: 112 },
  deleteButton: { alignItems: "center", borderColor: colors.border, borderRadius: 999, borderWidth: 1, height: 36, justifyContent: "center", width: 36 },
  detail: { color: colors.primaryDark, fontFamily: fonts.semibold, fontSize: 14 },
  disabledButton: { opacity: 0.55 },
  faded: { opacity: 0.45 },
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
  notificationRow: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 12 },
  preferenceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progressCenter: { alignItems: "center", justifyContent: "center", position: "absolute" },
  progressLabel: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 14 },
  progressValue: { color: colors.text, fontFamily: fonts.semibold, fontSize: 36 },
  progressWrap: { alignItems: "center", height: 170, justifyContent: "center", width: 170 },
  roundIcon: { alignItems: "center", backgroundColor: colors.surfaceSoft, borderRadius: 999, height: 42, justifyContent: "center", width: 42 },
  rowBetween: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  rowLeft: { alignItems: "center", flexDirection: "row", gap: 10 },
  rowTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 15 },
  sectionTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18 },
  settingsRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 },
  statCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 4, padding: 16 },
  statLabel: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13 },
  statValue: { color: colors.primary, fontFamily: fonts.semibold, fontSize: 28 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stickyFooter: { backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, left: 0, padding: 16, position: "absolute", right: 0 },
  swipeDelete: { alignItems: "center", backgroundColor: colors.danger, justifyContent: "center", marginVertical: 1, width: 76 },
  unreadDot: { backgroundColor: colors.primary, borderRadius: 999, height: 8, width: 8 },
});
