import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";

export default function PVerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const initialEmail = typeof params.email === "string" ? params.email : "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const handleVerifyOtp = async () => {
    if (busy) return;

    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code.");
      return;
    }

    Keyboard.dismiss();
    setBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/passenger/verify-email-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            otp: cleanOtp,
          }),
        }
      );

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        throw new Error(data?.message || "Verification failed.");
      }

      Alert.alert("Email Verified", data?.message || "You can now log in.", [
        {
          text: "Go to Login",
          onPress: () => router.replace("/login_and_reg/plogin"),
        },
      ]);
    } catch (error: any) {
      console.error("handleVerifyOtp error:", error);
      Alert.alert(
        "Verification Failed",
        error?.message || "Network/server error."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendBusy) return;

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    setResendBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/passenger/resend-email-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail }),
        }
      );

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to resend code.");
      }

      Alert.alert(
        "Code Sent",
        data?.message || "A new code has been sent to your email."
      );
    } catch (error: any) {
      console.error("handleResendOtp error:", error);
      Alert.alert("Resend Failed", error?.message || "Network/server error.");
    } finally {
      setResendBusy(false);
    }
  };

  const openGmail = async () => {
    const urls = [
      "googlegmail://",
      "https://mail.google.com/mail/u/0/#search/TODA%20Go%20verification%20code",
    ];

    for (const url of urls) {
      const canOpen = await Linking.canOpenURL(url).catch(() => false);

      if (canOpen || url.startsWith("https://")) {
        await Linking.openURL(url);
        return;
      }
    }
  };

  const openOutlook = async () => {
    const urls = [
      "ms-outlook://",
      "https://outlook.live.com/mail/0/search?q=TODA%20Go%20verification%20code",
    ];

    for (const url of urls) {
      const canOpen = await Linking.canOpenURL(url).catch(() => false);

      if (canOpen || url.startsWith("https://")) {
        await Linking.openURL(url);
        return;
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>
            Verify Your Email
          </Text>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.label, { color: colors.label }]}>Email</Text>

            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
              placeholder="example@email.com"
              placeholderTextColor={colors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <Text style={[styles.label, { color: colors.label }]}>
              Verification Code
            </Text>

            <TextInput
              style={[
                styles.otpInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              value={otp}
              onChangeText={(text) =>
                setOtp(text.replace(/[^0-9]/g, "").slice(0, 6))
              }
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify Email</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.spamNote, { color: colors.muted }]}>
              Didn’t see the code? Check your Inbox, Spam, or Promotions folder.
            </Text>

            <View style={styles.mailButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.secondaryButtonBg,
                  },
                ]}
                onPress={openGmail}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Open Gmail
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.secondaryButtonBg,
                  },
                ]}
                onPress={openOutlook}
              >
                <Text
                  style={[styles.secondaryButtonText, { color: colors.text }]}
                >
                  Open Outlook
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.outlineButton,
                { borderColor: colors.primary },
                resendBusy && styles.buttonDisabled,
              ]}
              onPress={handleResendOtp}
              disabled={resendBusy}
            >
              <Text style={[styles.outlineButtonText, { color: colors.primary }]}>
                {resendBusy ? "Sending..." : "Resend Code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/login_and_reg/pregister")}
            >
              <Text style={[styles.changeEmailText, { color: colors.primary }]}>
                Change Email / Register Again
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.footerText, { color: colors.muted }]}>
            Already verified?{" "}
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => router.replace("/login_and_reg/plogin")}
            >
              Go to Login
            </Text>
          </Text>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

function getColors(isDark: boolean) {
  return {
    background: isDark ? "#0F172A" : "#F8FAFC",
    card: isDark ? "#111827" : "#FFFFFF",
    inputBg: isDark ? "#1F2937" : "#FFFFFF",
    secondaryButtonBg: isDark ? "#1F2937" : "#F8FAFC",
    text: isDark ? "#F9FAFB" : "#111827",
    label: isDark ? "#E5E7EB" : "#374151",
    muted: isDark ? "#CBD5E1" : "#6B7280",
    placeholder: isDark ? "#9CA3AF" : "#8A8F98",
    border: isDark ? "#374151" : "#D1D5DB",
    primary: "#5089A3",
  };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  back: {
    fontSize: 16,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    borderRadius: 10,
    fontSize: 15,
    minHeight: 48,
    marginBottom: 14,
  },
  otpInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: Platform.OS === "ios" ? 15 : 10,
    paddingHorizontal: 16,
    fontSize: 28,
    letterSpacing: 8,
    fontWeight: "800",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#5089A3",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  spamNote: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  mailButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  outlineButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 14,
  },
  outlineButtonText: {
    fontSize: 14,
    fontWeight: "800",
  },
  changeEmailText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
  },
  footerText: {
    textAlign: "center",
    marginTop: 18,
    fontSize: 14,
  },
  link: {
    fontWeight: "800",
  },
});