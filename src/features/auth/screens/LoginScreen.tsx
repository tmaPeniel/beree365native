import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { AuthField, authColors, authStyles } from "@/features/auth/components/AuthUi";
import { signIn } from "@/features/auth/services/auth";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Connexion", "Veuillez saisir votre email et votre mot de passe.");
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      router.replace("/(tabs)/dashboard");
      return;
    }

    Alert.alert("Connexion impossible", result.error ?? "Une erreur inattendue est survenue.");
  };

  return (
    <View style={authStyles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardArea}
      >
        <ScrollView contentContainerStyle={authStyles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={authStyles.card}>
            <Text accessibilityRole="header" style={authStyles.title}>Connexion</Text>

            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="votre@email.com"
              returnKeyType="next"
              value={email}
            />
            <AuthField
              autoCapitalize="none"
              autoComplete="current-password"
              label="Mot de passe"
              onChangeText={setPassword}
              placeholder="••••••••"
              returnKeyType="done"
              right={(
                <Pressable
                  accessibilityLabel={passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setPasswordVisible((visible) => !visible)}
                >
                  {passwordVisible ? <EyeOff color={authColors.muted} size={16} /> : <Eye color={authColors.muted} size={16} />}
                </Pressable>
              )}
              secureTextEntry={!passwordVisible}
              value={password}
            />

            <Pressable
              accessibilityRole="link"
              onPress={() => router.push("/(auth)/forgot-password")}
              style={{ alignSelf: "flex-end", marginTop: -4 }}
            >
              <Text style={authStyles.link}>Mot de passe oublié ?</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={submit}
              style={({ pressed }) => [
                authStyles.primaryButton,
                (pressed || isSubmitting) && authStyles.primaryButtonDisabled,
              ]}
            >
              <Text style={authStyles.primaryButtonText}>{isSubmitting ? "Connexion…" : "Se connecter"}</Text>
            </Pressable>

            <Pressable accessibilityRole="link" onPress={() => router.push("/(auth)/signup")}>
              <Text style={authStyles.switchText}>Pas encore de compte? S’inscrire</Text>
            </Pressable>
          </View>

          <Text style={authStyles.legalText}>
            En vous connectant, vous acceptez nos <Text style={authStyles.legalLink}>CGU</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
