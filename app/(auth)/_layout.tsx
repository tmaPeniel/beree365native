import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/shared/theme/styles";

export default function AuthLayout() {
  return (
    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={{ backgroundColor: colors.background, flex: 1 }}>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: colors.background,
          },
          headerShown: false,
        }}
      />
    </SafeAreaView>
  );
}
