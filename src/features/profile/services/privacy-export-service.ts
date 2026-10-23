import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getCurrentUser } from "@/features/auth/services/auth/sessionService";
import { supabase } from "@/integrations/supabase/client";

type QueryError = { message: string } | null;

function readRows<T>(label: string, result: { data: T[] | null; error: QueryError }): T[] {
  if (result.error) {
    throw new Error(`${label} : ${result.error.message}`);
  }

  return result.data ?? [];
}

function readRow<T>(label: string, result: { data: T | null; error: QueryError }): T | null {
  if (result.error) {
    throw new Error(`${label} : ${result.error.message}`);
  }

  return result.data;
}

export async function exportCurrentUserData(): Promise<void> {
  const user = await getCurrentUser();

  if (!user?.id) {
    throw new Error("Utilisateur non authentifié");
  }

  const userId = user.id;
  const [
    profileResult,
    progressResult,
    badgesResult,
    verseLikesResult,
    consentsResult,
    notificationPreferencesResult,
    notificationsResult,
    pushSubscriptionsResult,
    rolesResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("user_progress")
      .select("id, chapter_id, status, completed_at, reading_plan_chapters(day_number, reference, plan_id)")
      .eq("user_id", userId),
    supabase
      .from("user_badges")
      .select("id, badge_id, unlocked_at, created_at, badges(name, description)")
      .eq("user_id", userId),
    supabase
      .from("verse_likes")
      .select("id, verse_day_number, created_at, daily_verses(reference, text, wisdomType)")
      .eq("user_id", userId),
    supabase.from("user_consents").select("*").eq("user_id", userId),
    supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("notifications_sent").select("*").eq("user_id", userId),
    supabase
      .from("push_subscriptions")
      .select("id, endpoint, user_agent, created_at")
      .eq("user_id", userId),
    supabase.from("user_roles").select("id, role, created_at").eq("user_id", userId),
  ]);

  const exportedAt = new Date();
  const payload = {
    schema_version: 1,
    exported_at: exportedAt.toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      created_at: user.created_at,
      updated_at: user.updated_at ?? null,
      last_sign_in_at: user.last_sign_in_at ?? null,
      email_confirmed_at: user.email_confirmed_at ?? null,
      phone_confirmed_at: user.phone_confirmed_at ?? null,
      metadata: user.user_metadata,
    },
    profile: readRow("Profil", profileResult),
    reading_progress: readRows("Progression de lecture", progressResult),
    badges: readRows("Badges", badgesResult),
    liked_verses: readRows("Versets favoris", verseLikesResult),
    consents: readRows("Consentements", consentsResult),
    notification_preferences: readRow(
      "Préférences de notification",
      notificationPreferencesResult,
    ),
    notification_history: readRows("Historique des notifications", notificationsResult),
    push_subscriptions: readRows("Abonnements push", pushSubscriptionsResult),
    roles: readRows("Rôles", rolesResult),
    security_note:
      "Les clés cryptographiques des abonnements push sont volontairement exclues de cet export.",
  };

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Le partage de fichiers n'est pas disponible sur cet appareil.");
  }

  const filename = `beree-365-export-${exportedAt.toISOString().slice(0, 10)}.json`;
  const exportFile = new File(Paths.cache, filename);
  exportFile.create({ overwrite: true });
  exportFile.write(JSON.stringify(payload, null, 2));

  await Sharing.shareAsync(exportFile.uri, {
    dialogTitle: "Exporter mes données Bérée 365",
    mimeType: "application/json",
    UTI: "public.json",
  });
}
