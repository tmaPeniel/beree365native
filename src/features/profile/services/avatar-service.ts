import { File } from "expo-file-system";
import { supabase } from "@/integrations/supabase/client";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
const AVATAR_EXTENSIONS = ["jpg", "png", "webp", "heic", "heif"] as const;

type UploadAvatarInput = {
  mimeType?: string | null;
  uri: string;
  userId: string;
};

type UploadAvatarResult =
  | { success: true; avatarUrl: string }
  | { success: false; error: string };

type RemoveAvatarResult =
  | { success: true }
  | { success: false; error: string };

function extensionForMimeType(mimeType?: string | null) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/heic") return "heic";
  if (mimeType === "image/heif") return "heif";
  return "jpg";
}

export async function uploadProfileAvatar({
  mimeType,
  uri,
  userId,
}: UploadAvatarInput): Promise<UploadAvatarResult> {
  try {
    const contentType = mimeType || "image/jpeg";
    const extension = extensionForMimeType(contentType);
    const imageFile = new File(uri);

    if (!imageFile.exists) {
      throw new Error("La photo sélectionnée n'a pas pu être lue.");
    }
    if (imageFile.size && imageFile.size > MAX_AVATAR_BYTES) {
      throw new Error("La photo dépasse la taille maximale de 8 Mo.");
    }

    const imageData = await imageFile.arrayBuffer();
    if (!imageData.byteLength) {
      throw new Error("La photo sélectionnée est vide.");
    }

    const objectPath = `${userId}/avatar.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(objectPath, imageData, {
        cacheControl: "3600",
        contentType,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", userId);

    if (profileError) throw profileError;

    return { success: true, avatarUrl };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Impossible de mettre à jour la photo de profil.",
    };
  }
}

export async function removeProfileAvatar(userId: string): Promise<RemoveAvatarResult> {
  try {
    const objectPaths = AVATAR_EXTENSIONS.map((extension) => `${userId}/avatar.${extension}`);
    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove(objectPaths);

    if (removeError) throw removeError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Impossible de retirer la photo de profil.",
    };
  }
}
