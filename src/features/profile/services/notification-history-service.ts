import { requireCurrentUserId } from "@/features/auth/services/auth/sessionService";
import { supabase } from "@/integrations/supabase/client";

export type NotificationHistoryItem = {
  id: string;
  kind: string;
  ref_id: string;
  sent_at: string;
};

export async function getNotificationHistory(limit = 30): Promise<NotificationHistoryItem[]> {
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from("notifications_sent")
    .select("id, kind, ref_id, sent_at")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Historique des notifications : ${error.message}`);
  }

  return data ?? [];
}
