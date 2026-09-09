import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/shared/utils/logger";

export type AudioSourceType = "youtube" | "mp3";

export interface AudioSource {
  id: string;
  planId: string;
  dayNumber: number;
  passageReferences?: string[];
  sourceType: AudioSourceType;
  sourceUrl: string;
  durationSeconds?: number;
}

type AudioReadingRow = {
  id: string;
  plan_id: string;
  day_number: number;
  source_type: string;
  source_url: string | null;
  youtube_url: string | null;
  duration_seconds: number | null;
};

export async function getDailyAudio(planId: string, dayNumber: number): Promise<AudioSource | null> {
  if (!planId || !dayNumber) return null;

  try {
    const { data, error } = await supabase
      .from("audio_readings")
      .select("id,plan_id,day_number,source_type,source_url,youtube_url,duration_seconds")
      .eq("plan_id", planId)
      .eq("day_number", dayNumber)
      .maybeSingle();

    if (error) throw error;
    return normalizeAudioSource(data);
  } catch (error) {
    logger.error("Get daily audio error", error);
    throw error;
  }
}

export function normalizeAudioSource(row: AudioReadingRow | null): AudioSource | null {
  if (!row) return null;

  const sourceType = normalizeAudioSourceType(row.source_type);
  const sourceUrl = row.source_url || row.youtube_url;

  if (!sourceType || !sourceUrl) return null;

  return {
    id: row.id,
    planId: row.plan_id,
    dayNumber: row.day_number,
    sourceType,
    sourceUrl,
    durationSeconds: row.duration_seconds || undefined,
  };
}

export function normalizeAudioSourceType(value: string | null): AudioSourceType | null {
  if (value === "youtube" || value === "mp3") return value;
  return null;
}

export function extractYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsedUrl.pathname.split("/").filter(Boolean)[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (parsedUrl.pathname === "/watch") {
        return parsedUrl.searchParams.get("v");
      }

      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if ((parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") && parts[1]) {
        return parts[1];
      }
    }

    return null;
  } catch {
    return null;
  }
}
