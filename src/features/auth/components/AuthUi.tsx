import type { ReactNode } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { colors, fonts } from "@/shared/theme/styles";

export const authColors = {
  background: "#FCFBF9",
  border: "#E8DDD4",
  primary: "#B86521",
  text: "#17100C",
  muted: "#7D6253",
};

type FieldProps = TextInputProps & {
  label: string;
  right?: ReactNode;
  labelIcon?: ReactNode;
  hint?: string;
};

export function AuthField({ label, right, labelIcon, hint, style, ...props }: FieldProps) {
  return (
    <View style={authStyles.fieldGroup}>
      <View style={authStyles.labelRow}>
        {labelIcon}
        <Text style={authStyles.label}>{label}</Text>
      </View>
      <View style={authStyles.inputFrame}>
        <TextInput
          placeholderTextColor="#9B7460"
          selectionColor={authColors.primary}
          style={[authStyles.input, right ? authStyles.inputWithAction : null, style]}
          {...props}
        />
        {right ? <View style={authStyles.inputAction}>{right}</View> : null}
      </View>
      {hint ? <Text style={authStyles.hint}>{hint}</Text> : null}
    </View>
  );
}

export const authStyles = StyleSheet.create({
  screen: { backgroundColor: authColors.background, flex: 1 },
  keyboardArea: { flex: 1 },
  scrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  signupScrollContent: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 7,
    paddingVertical: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: authColors.border,
    borderRadius: 15,
    borderTopColor: authColors.primary,
    borderTopWidth: 3,
    borderWidth: 1,
    elevation: 4,
    gap: 18,
    maxWidth: 390,
    paddingHorizontal: 22,
    paddingVertical: 24,
    shadowColor: "#2E1B0F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.13,
    shadowRadius: 9,
    width: "100%",
  },
  signupCard: { gap: 16, paddingHorizontal: 20, paddingVertical: 24 },
  title: {
    color: authColors.text,
    fontFamily: fonts.semibold,
    fontSize: 19,
    textAlign: "center",
  },
  signupTitle: { fontSize: 20 },
  subtitle: {
    color: authColors.muted,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: -10,
    textAlign: "center",
  },
  fieldGroup: { gap: 8 },
  labelRow: { alignItems: "center", flexDirection: "row", gap: 4 },
  label: { color: authColors.text, fontFamily: fonts.semibold, fontSize: 13 },
  inputFrame: { justifyContent: "center", position: "relative" },
  input: {
    backgroundColor: "#FFFEFD",
    borderColor: authColors.border,
    borderRadius: 13,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    height: 46,
    paddingHorizontal: 12,
  },
  inputWithAction: { paddingRight: 44 },
  inputAction: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 7,
    width: 34,
  },
  hint: { color: authColors.muted, fontFamily: fonts.regular, fontSize: 10, lineHeight: 14 },
  link: {
    color: authColors.primary,
    fontFamily: fonts.regular,
    fontSize: 12,
    textDecorationLine: "underline",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: authColors.primary,
    borderRadius: 13,
    flexDirection: "row",
    gap: 10,
    height: 46,
    justifyContent: "center",
    marginTop: 2,
  },
  primaryButtonDisabled: { opacity: 0.62 },
  primaryButtonText: { color: "#FFFFFF", fontFamily: fonts.semibold, fontSize: 12 },
  switchText: {
    color: authColors.primary,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  legalText: {
    color: authColors.muted,
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: 16,
    textAlign: "center",
  },
  legalLink: { color: authColors.primary },
  checkboxPanel: {
    alignItems: "flex-start",
    borderColor: authColors.border,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  checkbox: {
    alignItems: "center",
    borderColor: authColors.primary,
    borderRadius: 999,
    borderWidth: 1,
    height: 16,
    justifyContent: "center",
    marginTop: 1,
    width: 16,
  },
  checkboxFill: { backgroundColor: authColors.primary, borderRadius: 999, height: 8, width: 8 },
  checkboxText: {
    color: authColors.text,
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  accentText: { color: authColors.primary },
});
