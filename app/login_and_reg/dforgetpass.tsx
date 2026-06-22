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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config";

export default function PForgetPass() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const sendOtp = async () => {
    if (sendBusy) return;

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    Keyboard.dismiss();
    setSendBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/passenger/forgot-password/send-otp`,
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
        throw new Error(data?.message || "Unable to send reset code.");
      }

      setOtpSent(true);
      Alert.alert(
        "Code Sent",
        data?.message || "Password reset code has been sent to your email."
      );
    } catch (error: any) {
      Alert.alert("Send Failed", error?.message || "Network/server error.");
    } finally {
      setSendBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (verifyBusy) return;

    const cleanOtp = otp.trim();

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Please enter your email address.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      Alert.alert("Invalid Code", "Please enter the 6-digit reset code.");
      return;
    }

    Keyboard.dismiss();
    setVerifyBusy(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/passenger/forgot-password/verify-otp`,
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
        throw new Error(data?.message || "Invalid reset code.");
      }

      router.replace({
        pathname: "/login_and_reg/changepass",
        params: {
          email: cleanEmail,
          userType: "passenger",
        },
      });
    } catch (error: any) {
      Alert.alert("Verification Failed", error?.message || "Network/server error.");
    } finally {
      setVerifyBusy(false);
    }
  };

  const openGmail = async () => {
    const urls = [
      "googlegmail://",
      "https://mail.google.com/mail/u/0/#search/TODA%20Go%20password%20reset%20code",
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
      "https://outlook.live.com/mail/0/search?q=TODA%20Go%20password%20reset%20code",
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.back, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>
            Forgot Password
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Enter your passenger email and we’ll send a 6-digit code to reset your password.
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
              onChangeText={(text) => {
                setEmail(text);
                setOtpSent(false);
                setOtp("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <TouchableOpacity
              style={[styles.button, sendBusy && styles.buttonDisabled]}
              onPress={sendOtp}
              disabled={sendBusy}
            >
              {sendBusy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {otpSent ? "Resend Code" : "Send Code"}
                </Text>
              )}
            </TouchableOpacity>

            {otpSent && (
              <>
                <Text style={[styles.label, { color: colors.label }]}>
                  Reset Code
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
                  style={[styles.button, verifyBusy && styles.buttonDisabled]}
                  onPress={verifyOtp}
                  disabled={verifyBusy}
                >
                  {verifyBusy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify Code</Text>
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
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
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
                    <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                      Open Outlook
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <Text style={[styles.footerText, { color: colors.muted }]}>
            Remembered your password?{" "}
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  back: {
    fontSize: 16,
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
    marginTop: 4,
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
    width: "100%",
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
    borderRadius: 10,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 8,
    minHeight: 56,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#5089A3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 14,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  spamNote: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 12,
  },
  mailButtonsRow: {
    flexDirection: "row",
    gap: 10,
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
  footerText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 18,
  },
  link: {
    fontWeight: "900",
  },
});