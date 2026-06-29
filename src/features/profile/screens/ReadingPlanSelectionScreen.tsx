import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, Check, ChevronLeft, Clock3, Crown, Lock, RefreshCw } from "lucide-react-native";
import { getPlanImage } from "@/assets/planImages";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePremium } from "@/features/profile/hooks/usePremium";
import {
  changePlan,
  getReadingPlanCatalog,
  getUserPlan,
  ReadingPlanCatalogItem,
} from "@/features/reading/services/readingPlan/planService";
import { colors, fonts, styles as themeStyles } from "@/shared/theme/styles";

type PlanState = "selected" | "available" | "premium" | "unavailable";

function isCanonicalPlan(plan: ReadingPlanCatalogItem) {
  return plan.name.trim().toLowerCase() === "canonique 12 mois";
}

function getPlanImageSource(plan: ReadingPlanCatalogItem): ImageSourcePropType | null {
  const localImage = getPlanImage(plan.id);
  if (localImage) return localImage;
  if (plan.image_url) return { uri: plan.image_url };
  return null;
}

function getPlanState(plan: ReadingPlanCatalogItem, selectedPlanId?: string | null, isPremium = false): PlanState {
  if (plan.id === selectedPlanId) return "selected";
  if (!plan.is_available) return "unavailable";
  if (!isPremium && !isCanonicalPlan(plan)) return "premium";
  return "available";
}

function stateCopy(state: PlanState) {
  if (state === "selected") return { label: "Actuel", tone: "selected" as const };
  if (state === "available") return { label: "Disponible", tone: "available" as const };
  if (state === "premium") return { label: "Premium", tone: "locked" as const };
  return { label: "Indisponible", tone: "locked" as const };
}

function Header() {
  const insets = useSafeAreaInsets();
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/profile");
  };

  return (
    <View style={[screenStyles.header, { paddingTop: insets.top + 8 }]}>
      <View style={screenStyles.headerRow}>
        <Pressable
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={8}
          onPress={goBack}
          style={({ pressed }) => [screenStyles.backButton, pressed && screenStyles.backButtonPressed]}
        >
          <ChevronLeft color={colors.text} size={22} strokeWidth={2} />
        </Pressable>
        <View style={screenStyles.headerCopy}>
          <Text numberOfLines={1} style={themeStyles.heading}>Plan de lecture</Text>
          <Text numberOfLines={2} style={themeStyles.subheading}>
            Choisissez le parcours qui guidera votre lecture quotidienne.
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyState({ isError, onRetry }: { isError: boolean; onRetry: () => void }) {
  return (
    <View style={screenStyles.emptyState}>
      <BookOpen color={colors.primary} size={30} />
      <Text style={screenStyles.emptyTitle}>
        {isError ? "Plans indisponibles" : "Aucun plan disponible"}
      </Text>
      <Text style={themeStyles.subheading}>
        {isError
          ? "Impossible de charger les plans de lecture pour le moment."
          : "Verifiez la configuration des plans dans Supabase."}
      </Text>
      <Pressable onPress={onRetry} style={themeStyles.secondaryButton}>
        <Text style={themeStyles.secondaryButtonText}>Reessayer</Text>
      </Pressable>
    </View>
  );
}

function PlanCard({
  disabled,
  isChanging,
  onPress,
  plan,
  state,
}: {
  disabled: boolean;
  isChanging: boolean;
  onPress: () => void;
  plan: ReadingPlanCatalogItem;
  state: PlanState;
}) {
  const imageSource = getPlanImageSource(plan);
  const copy = stateCopy(state);
  const Icon = state === "selected" ? Check : state === "premium" ? Crown : state === "unavailable" ? Lock : BookOpen;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        screenStyles.planCard,
        state === "selected" && screenStyles.planCardSelected,
        state !== "available" && state !== "selected" && screenStyles.planCardMuted,
        pressed && !disabled && screenStyles.planCardPressed,
      ]}
    >
      {imageSource ? (
        <Image source={imageSource} style={screenStyles.planImage} />
      ) : (
        <View style={screenStyles.planImageFallback}>
          <BookOpen color={colors.primary} size={28} />
        </View>
      )}

      <View style={screenStyles.planBody}>
        <View style={screenStyles.planTitleRow}>
          <View style={screenStyles.planTitleCopy}>
            <Text numberOfLines={2} style={screenStyles.planName}>{plan.name}</Text>
            <View style={screenStyles.durationRow}>
              <Clock3 color={colors.muted} size={15} />
              <Text style={screenStyles.durationText}>{plan.duration_days} jours</Text>
            </View>
          </View>
          <View
            style={[
              screenStyles.badge,
              copy.tone === "selected" && screenStyles.badgeSelected,
              copy.tone === "available" && screenStyles.badgeAvailable,
              copy.tone === "locked" && screenStyles.badgeLocked,
            ]}
          >
            <Icon
              color={copy.tone === "locked" ? colors.muted : copy.tone === "available" ? colors.primary : "#FFFFFF"}
              size={14}
            />
            <Text
              style={[
                screenStyles.badgeText,
                copy.tone === "selected" && screenStyles.badgeTextSelected,
                copy.tone === "locked" && screenStyles.badgeTextLocked,
              ]}
            >
              {copy.label}
            </Text>
          </View>
        </View>

        <Text numberOfLines={3} style={themeStyles.subheading}>
          {plan.description || "Parcours de lecture biblique Beree 365."}
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          style={[
            state === "available" ? themeStyles.primaryButton : themeStyles.secondaryButton,
            screenStyles.cardButton,
            disabled && screenStyles.disabledButton,
          ]}
        >
          {isChanging ? (
            <ActivityIndicator color={state === "available" ? "#FFFFFF" : colors.primary} />
          ) : (
            <Text style={state === "available" ? themeStyles.primaryButtonText : themeStyles.secondaryButtonText}>
              {state === "selected"
                ? "Plan selectionne"
                : state === "premium"
                  ? "Reserve Premium"
                  : state === "unavailable"
                    ? "Bientot disponible"
                    : "Choisir ce plan"}
            </Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}

export function ReadingPlanSelectionScreen() {
  const { profile, refreshProfile, user } = useAuth();
  const premium = usePremium();
  const queryClient = useQueryClient();
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

  const selectedPlanId = profile?.selected_plan_id;

  const catalogQuery = useQuery({
    queryKey: ["mobile-reading-plan-catalog"],
    queryFn: getReadingPlanCatalog,
  });

  const currentPlanQuery = useQuery({
    queryKey: ["mobile-current-plan", user?.id],
    queryFn: () => getUserPlan(user.id),
    enabled: !!user?.id,
  });

  const plans = useMemo(() => {
    return [...(catalogQuery.data || [])].sort((left, right) => {
      const leftState = getPlanState(left, selectedPlanId, premium.isPremium);
      const rightState = getPlanState(right, selectedPlanId, premium.isPremium);
      const order: Record<PlanState, number> = { selected: 0, available: 1, premium: 2, unavailable: 3 };
      return order[leftState] - order[rightState] || left.name.localeCompare(right.name);
    });
  }, [catalogQuery.data, premium.isPremium, selectedPlanId]);

  const availableCount = plans.filter((plan) => plan.is_available).length;
  const unavailableCount = plans.filter((plan) => !plan.is_available).length;

  const refreshReadingCaches = async () => {
    await Promise.all([
      refreshProfile(),
      queryClient.invalidateQueries({ queryKey: ["mobile-current-plan", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["user-plan-duration", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-reading-plan-progress", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-reading-day", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-stats", user?.id] }),
      queryClient.invalidateQueries({ queryKey: ["mobile-profile-activity", user?.id] }),
    ]);
  };

  const requestPlanChange = (plan: ReadingPlanCatalogItem) => {
    const state = getPlanState(plan, selectedPlanId, premium.isPremium);

    if (state === "selected") {
      Alert.alert("Plan de lecture", "Ce plan est deja selectionne.");
      return;
    }

    if (state === "unavailable") {
      Alert.alert("Plan indisponible", "Ce plan n'est pas encore ouvert a la selection.");
      return;
    }

    if (state === "premium") {
      Alert.alert(
        "Plan Premium",
        "Ce plan demande un abonnement Premium actif.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Voir Premium", onPress: () => router.push("/premium") },
        ]
      );
      return;
    }

    Alert.alert(
      "Changer de plan ?",
      "Votre progression et vos badges de lecture seront remis a zero pour demarrer ce nouveau parcours aujourd'hui.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Changer",
          style: "destructive",
          onPress: async () => {
            setChangingPlanId(plan.id);
            const result = await changePlan(plan.id);
            setChangingPlanId(null);

            if (!result.success) {
              Alert.alert("Plan de lecture", result.error || "Impossible de changer de plan.");
              return;
            }

            await refreshReadingCaches();
            Alert.alert("Plan mis a jour", `${plan.name} est maintenant votre plan de lecture.`, [
              { text: "Rester ici", style: "cancel" },
              { text: "Voir le plan", onPress: () => router.replace("/(tabs)/reading") },
            ]);
          },
        },
      ]
    );
  };

  return (
    <View style={themeStyles.screen}>
      <FlatList
        ListEmptyComponent={
          catalogQuery.isLoading ? (
            <View style={screenStyles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={themeStyles.subheading}>Chargement des plans...</Text>
            </View>
          ) : (
            <EmptyState isError={catalogQuery.isError} onRetry={() => void catalogQuery.refetch()} />
          )
        }
        ListHeaderComponent={
          <View style={screenStyles.listHeader}>
            <Header />
            <View style={screenStyles.summary}>
              <View style={screenStyles.summaryIcon}>
                <BookOpen color={colors.primary} size={24} />
              </View>
              <View style={screenStyles.summaryCopy}>
                <Text style={screenStyles.summaryTitle}>
                  {currentPlanQuery.data?.name || "Votre plan actuel"}
                </Text>
                <Text style={themeStyles.subheading}>
                  {availableCount} disponible{availableCount > 1 ? "s" : ""}
                  {unavailableCount ? `, ${unavailableCount} indisponible${unavailableCount > 1 ? "s" : ""}` : ""}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Rafraichir les plans"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => void catalogQuery.refetch()}
                style={screenStyles.refreshButton}
              >
                <RefreshCw color={colors.primaryDark} size={18} />
              </Pressable>
            </View>
          </View>
        }
        contentContainerStyle={screenStyles.content}
        data={plans}
        keyExtractor={(item) => item.id}
        refreshing={catalogQuery.isRefetching}
        onRefresh={() => void catalogQuery.refetch()}
        renderItem={({ item }) => {
          const state = getPlanState(item, selectedPlanId, premium.isPremium);
          const disabled = state !== "available" || !!changingPlanId;
          return (
            <PlanCard
              disabled={disabled}
              isChanging={changingPlanId === item.id}
              onPress={() => requestPlanChange(item)}
              plan={item}
              state={state}
            />
          );
        }}
      />
    </View>
  );
}

const screenStyles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  backButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  badge: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 9,
  },
  badgeAvailable: {
    backgroundColor: colors.surfaceSoft,
  },
  badgeLocked: {
    backgroundColor: "#F3F0EC",
  },
  badgeSelected: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    color: colors.primary,
    fontFamily: fonts.semibold,
    fontSize: 12,
  },
  badgeTextLocked: {
    color: colors.muted,
  },
  badgeTextSelected: {
    color: "#FFFFFF",
  },
  cardButton: {
    minHeight: 46,
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 112,
  },
  disabledButton: {
    opacity: 0.74,
  },
  durationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  durationText: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 13,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 19,
  },
  header: {
    gap: 4,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  listHeader: {
    gap: 16,
  },
  loadingState: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
  },
  planBody: {
    gap: 12,
    padding: 14,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  planCardMuted: {
    opacity: 0.86,
  },
  planCardPressed: {
    transform: [{ scale: 0.992 }],
  },
  planCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  planImage: {
    backgroundColor: colors.surfaceSoft,
    height: 138,
    width: "100%",
  },
  planImageFallback: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    height: 138,
    justifyContent: "center",
    width: "100%",
  },
  planName: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 25,
  },
  planTitleCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  planTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  summary: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  summaryIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  summaryTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
});
