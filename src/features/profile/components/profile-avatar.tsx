import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/shared/theme/styles";

type ProfileAvatarProps = {
  avatarUrl?: string | null;
  initials: string;
  size?: number;
};

export function getProfileInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "Utilisateur";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ProfileAvatar({ avatarUrl, initials, size = 72 }: ProfileAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showImage = !!avatarUrl && !imageFailed;

  return (
    <View
      accessibilityLabel={showImage ? "Photo de profil" : `Avatar ${initials}`}
      accessible
      style={[avatarStyles.container, { height: size, width: size }]}
    >
      {showImage ? (
        <Image
          accessibilityLabel="Photo de profil"
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={{ uri: avatarUrl }}
          style={StyleSheet.absoluteFill}
          transition={180}
        />
      ) : (
        <Text style={[avatarStyles.initials, { fontSize: Math.max(17, size * 0.28) }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#F3E9E2",
    borderCurve: "continuous",
    borderRadius: 999,
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: colors.primary,
    fontFamily: fonts.bold,
    letterSpacing: 0,
  },
});
