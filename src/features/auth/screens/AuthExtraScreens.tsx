import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { CalendarDays, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react-native";
import { AuthField, authColors, authStyles } from "@/features/auth/components/AuthUi";
import { getAvailablePlans } from "@/features/reading/services/readingPlan/planService";
import { resetPassword, signUp, updatePassword } from "@/features/auth/services/auth";
import { colors, styles } from "@/shared/theme/styles";

const todayDisplay = () => new Intl.DateTimeFormat("fr-FR").format(new Date());

const displayDateToIso = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getDate() !== Number(day) ||
    parsed.getMonth() + 1 !== Number(month) ||
    parsed.getFullYear() !== Number(year)
  ) return null;
  return `${year}-${month}-${day}`;
};

export function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [startDate, setStartDate] = useState(todayDisplay());
  const [secretCode, setSecretCode] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["mobile-signup-plans"],
    queryFn: getAvailablePlans,
  });

  const submit = async () => {
    const planId = plansQuery.data?.[0]?.id;
    const startDateIso = displayDateToIso(startDate);

    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Inscription", "Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (!startDateIso) {
      Alert.alert("Date invalide", "Utilisez le format JJ/MM/AAAA.");
      return;
    }
    if (!termsAccepted) {
      Alert.alert("Inscription", "Vous devez accepter les CGU et la politique de cookies.");
      return;
    }
    if (!planId) {
      Alert.alert("Inscription", "Le plan de lecture par défaut est indisponible. Réessayez dans un instant.");
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(email.trim(), password, fullName.trim(), startDateIso, planId);
    setIsSubmitting(false);

    if (result.success) {
      Alert.alert("Inscription", "Votre compte a été créé.", [
        { text: "Continuer", onPress: () => router.replace("/(tabs)/dashboard") },
      ]);
      return;
    }

    Alert.alert("Inscription impossible", result.error ?? "Une erreur est survenue.");
  };

  return (
    <View style={authStyles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardArea}
      >
        <ScrollView
          contentContainerStyle={authStyles.signupScrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[authStyles.card, authStyles.signupCard]}>
            <Text accessibilityRole="header" style={[authStyles.title, authStyles.signupTitle]}>Inscription</Text>
            <Text style={authStyles.subtitle}>Créez votre compte</Text>

            <AuthField
              autoCapitalize="words"
              autoComplete="name"
              label="Nom complet"
              onChangeText={setFullName}
              placeholder="Nom complet"
              value={fullName}
            />
            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={setEmail}
              placeholder="votre@email.com"
              value={email}
            />
            <AuthField
              autoCapitalize="none"
              autoComplete="new-password"
              label="Mot de passe"
              onChangeText={setPassword}
              placeholder="••••••••"
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
            <AuthField
              keyboardType="numbers-and-punctuation"
              label="Date de début du plan de lecture"
              maxLength={10}
              onChangeText={setStartDate}
              placeholder="JJ/MM/AAAA"
              right={<CalendarDays color={authColors.text} size={16} />}
              value={startDate}
            />
            <AuthField
              autoCapitalize="characters"
              hint="Si vous avez reçu un code, saisissez-le pour activer la version premium."
              label="Code secret (optionnel)"
              labelIcon={<KeyRound color={authColors.text} size={15} />}
              onChangeText={setSecretCode}
              placeholder="Code premium"
              value={secretCode}
            />

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: termsAccepted }}
              onPress={() => setTermsAccepted((accepted) => !accepted)}
              style={authStyles.checkboxPanel}
            >
              <View style={authStyles.checkbox}>{termsAccepted ? <View style={authStyles.checkboxFill} /> : null}</View>
              <Text style={authStyles.checkboxText}>
                J’accepte les <Text style={authStyles.accentText}>Conditions Générales d’Utilisation</Text> et la <Text style={authStyles.accentText}>Politique de cookies *</Text>
              </Text>
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
              <CheckCircle2 color="#FFFFFF" size={15} />
              <Text style={authStyles.primaryButtonText}>{isSubmitting ? "Inscription…" : "S’inscrire"}</Text>
            </Pressable>

            <Pressable accessibilityRole="link" onPress={() => router.replace("/(auth)/login")}>
              <Text style={authStyles.switchText}>Déjà un compte? Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setIsSubmitting(true);
    const result = await resetPassword(email.trim());
    setIsSubmitting(false);
    Alert.alert(
      "Mot de passe",
      result.success ? "Un email de réinitialisation a été envoyé." : result.error ?? "Erreur."
    );
  };

  return (
    <View style={[styles.screen, styles.center, { alignItems: "stretch", gap: 16 }]}>
      <Text style={styles.heading}>Mot de passe oublié</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={email}
      />
      <Pressable disabled={isSubmitting} onPress={submit} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Envoyer le lien</Text>
      </Pressable>
    </View>
  );
}

export function ResetPasswordScreen() {
  const [password, setPassword] = useState("");

  const submit = async () => {
    const result = await updatePassword(password);
    Alert.alert(
      "Mot de passe",
      result.success ? "Votre mot de passe a été mis à jour." : result.error ?? "Erreur."
    );
  };

  return (
    <View style={[styles.screen, styles.center, { alignItems: "stretch", gap: 16 }]}>
      <Text style={styles.heading}>Nouveau mot de passe</Text>
      <TextInput
        onChangeText={setPassword}
        placeholder="Nouveau mot de passe"
        placeholderTextColor={colors.muted}
        secureTextEntry
        style={styles.input}
        value={password}
      />
      <Pressable onPress={submit} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Mettre à jour</Text>
      </Pressable>
    </View>
  );
}
