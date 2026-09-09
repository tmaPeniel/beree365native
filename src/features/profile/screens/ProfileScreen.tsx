import type { ComponentType } from "react";
import { Alert, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  Crown,
  Heart,
  Info,
  LogOut,
  Pencil,
  Settings,
  Share2,
} from "lucide-react-native";
import { signOut } from "@/features/auth/services/auth";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getProfileInitials, ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { MotionView, PressableScale } from "@/shared/animation/Motion";
import { colors, fonts } from "@/shared/theme/styles";

type MenuItem = {
  icon: ComponentType<{ color: string; size: number; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  href?: string;
  isDanger?: boolean;
  onPress?: () => void;
};

const ICON_SIZE = 20;

function ProfileMenuItem({ delay = 0, item }: { delay?: number; item: MenuItem }) {
  const Icon = item.icon;
  const tint = item.isDanger ? colors.danger : colors.primary;

  const handlePress = () => {
    if (item.onPress) {
      item.onPress();
      return;
    }

    if (item.href) {
      router.push(item.href as any);
    }
  };

  return (
    <MotionView delay={delay}>
      <PressableScale
        accessibilityRole="button"
        onPress={handlePress}
        pressedScale={0.985}
        style={({ pressed }) => [profileStyles.menuItem, pressed && profileStyles.menuItemPressed]}
      >
        <View style={[profileStyles.iconBadge, item.isDanger && profileStyles.dangerIconBadge]}>
          <Icon color={tint} size={ICON_SIZE} strokeWidth={1.9} />
        </View>
        <View style={profileStyles.menuCopy}>
          <Text style={[profileStyles.menuTitle, item.isDanger && profileStyles.dangerText]}>
            {item.title}
          </Text>
          <Text style={profileStyles.menuSubtitle}>{item.subtitle}</Text>
        </View>
        <ChevronRight color={colors.muted} size={20} strokeWidth={1.8} />
      </PressableScale>
    </MotionView>
  );
}

export function ProfileScreen() {
  const { profile, user } = useAuth();
  const fullName = profile?.full_name || "Utilisateur";
  const email = user?.email ?? "";
  const initials = getProfileInitials(profile?.full_name, user?.email);

  const logout = () => {
    Alert.alert("Deconnexion", "Voulez-vous vraiment vous deconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Deconnexion",
        style: "destructive",
        onPress: async () => {
          const result = await signOut();
          if (!result.success) {
            Alert.alert("Deconnexion", result.error ?? "Impossible de vous deconnecter.");
          }
        },
      },
    ]);
  };

  const shareApp = async () => {
    await Share.share({
      message:
        "Decouvre Beree 365, une application pour avancer chaque jour dans ta lecture biblique.",
    });
  };

  const menuItems: MenuItem[] = [
    {
      icon: BookOpen,
      title: "Plan de lecture",
      subtitle: "Gerer votre plan de lecture",
      href: "/reading-plan",
    },
    {
      icon: BarChart3,
      title: "Statistiques",
      subtitle: "Voir vos progres",
      href: "/profile/statistics",
    },
    {
      icon: Award,
      title: "Badges",
      subtitle: "Vos recompenses et accomplissements",
      href: "/profile/badges",
    },
    {
      icon: Heart,
      title: "Verset du jour",
      subtitle: "Mediter sur la Parole",
      href: "/verses",
    },
    {
      icon: Crown,
      title: "Mon abonnement",
      subtitle: "Details de votre abonnement Premium",
      href: "/profile/subscription",
    },
    {
      icon: Settings,
      title: "Parametres",
      subtitle: "Gerer vos preferences",
      href: "/profile/settings",
    },
    {
      icon: Info,
      title: "A propos",
      subtitle: "Informations sur l'application",
      href: "/profile/about",
    },
    {
      icon: Share2,
      title: "Partager l'app",
      subtitle: "Inviter vos amis",
      onPress: shareApp,
    },
  ];

  return (
    <ScrollView
      style={profileStyles.screen}
      contentContainerStyle={profileStyles.content}
      showsVerticalScrollIndicator
    >
      <MotionView style={profileStyles.header}>
        <View style={profileStyles.avatarWrap}>
          <ProfileAvatar avatarUrl={profile?.avatar_url} initials={initials} />
          <View style={profileStyles.crownBadge}>
            <Crown color="#3F2A19" size={15} strokeWidth={2} />
          </View>
        </View>

        <Text style={profileStyles.name}>{fullName}</Text>
        {!!email && <Text style={profileStyles.email}>{email}</Text>}

        <PressableScale
          accessibilityRole="button"
          onPress={() => router.push("/profile/edit")}
          pressedScale={0.96}
          style={({ pressed }) => [profileStyles.editButton, pressed && profileStyles.editButtonPressed]}
        >
          <Pencil color={colors.text} size={16} strokeWidth={1.9} />
          <Text style={profileStyles.editText}>Editer le profil</Text>
        </PressableScale>
      </MotionView>

      <View style={profileStyles.menu}>
        {menuItems.map((item, index) => (
          <ProfileMenuItem key={item.title} delay={80 + index * 38} item={item} />
        ))}
      </View>

      <View style={profileStyles.separator} />

      <ProfileMenuItem
        delay={420}
        item={{
          icon: LogOut,
          title: "Deconnexion",
          subtitle: "Se deconnecter de l'application",
          isDanger: true,
          onPress: logout,
        }}
      />
    </ScrollView>
  );
}

const profileStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    paddingBottom: 112,
  },
  header: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  avatarWrap: {
    marginBottom: 14,
  },
  crownBadge: {
    alignItems: "center",
    backgroundColor: "#F6BF25",
    borderRadius: 999,
    bottom: -3,
    height: 26,
    justifyContent: "center",
    position: "absolute",
    right: -3,
    width: 26,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 22,
    letterSpacing: 0,
    textAlign: "center",
  },
  email: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  editButton: {
    alignItems: "center",
    borderColor: "#D8CABE",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  editButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  editText: {
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 14,
  },
  menu: {
    paddingTop: 18,
  },
  menuItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    minHeight: 72,
    paddingHorizontal: 36,
  },
  menuItemPressed: {
    backgroundColor: "#FAF6F1",
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: "#FAF7F2",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  dangerIconBadge: {
    backgroundColor: "#FFF5F3",
  },
  menuCopy: {
    flex: 1,
    gap: 3,
  },
  menuTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 0,
  },
  menuSubtitle: {
    color: colors.muted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  dangerText: {
    color: "#EF3F38",
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
    marginHorizontal: 36,
    marginVertical: 12,
  },
});
