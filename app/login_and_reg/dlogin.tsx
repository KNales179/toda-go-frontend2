import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  StatusBar,
  Alert,
  Keyboard,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

type NoticeType = "email" | "admin" | "rejected" | null;

export default function DLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const [noticeType, setNoticeType] = useState<NoticeType>(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const loginDriver = async () => {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    Keyboard.dismiss();
    setBusy(true);
    setNoticeType(null);
    setNoticeMessage("");
    setVerificationEmail("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/driver/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        console.error("Server did not return JSON. Body:", text?.slice(0, 200));
        throw new Error("Invalid server response: not JSON");
      }

      if (!response.ok) {
        if (data?.needEmailVerification || data?.needVerification) {
          setNoticeType("email");
          setNoticeMessage(
            data?.message || "Please verify your email before logging in."
          );
          setVerificationEmail(data?.email || cleanEmail);
          return;
        }

        if (data?.needAdminVerification) {
          const status = data?.driverVerification?.status;

          setNoticeType(status === "reject" ? "rejected" : "admin");
          setNoticeMessage(
            data?.message ||
              (status === "reject"
                ? "Your driver verification was rejected. Please contact TFRO/admin."
                : "Your driver account is still waiting for admin verification.")
          );
          return;
        }

        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      }

      const driverId =
        data?.driver?._id ||
        data?.user?._id ||
        data?.driverId ||
        data?._id;

      if (!driverId) {
        throw new Error("Login succeeded but no driverId returned");
      }

      const token =
        data?.token || data?.accessToken || data?.jwt || data?.authToken;

      if (!token) {
        throw new Error("Login succeeded but no token returned");
      }

      await AsyncStorage.setItem("driverId", String(driverId));
      await AsyncStorage.setItem("token", String(token));
      await AsyncStorage.setItem("role", "driver");
      await AsyncStorage.setItem("userId", String(driverId));
      await AsyncStorage.setItem(
        "toda.auth",
        JSON.stringify({
          token: String(token),
          role: "driver",
          userId: String(driverId),
          driverId: String(driverId),
        })
      );

      const infoRes = await fetch(`${API_BASE_URL}/api/driver/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const infoText = await infoRes.text();
      let info: any = null;

      try {
        info = infoText ? JSON.parse(infoText) : null;
      } catch {}

      const driver = info?.driver || null;
      const r = driver?.restriction || null;

      const isRestricted = !!r?.isRestricted;
      const endAt = r?.endAt ? new Date(r.endAt).getTime() : null;
      const active = isRestricted && (!endAt || endAt > Date.now());

      if (active) {
        router.replace({
          pathname: "/restriction",
          params: {
            userType: "driver",
            name: driver?.driverName || "Driver",
            type: r?.type || "ban",
            reason: r?.reason || "",
            endAt: r?.endAt ? String(r.endAt) : "",
          },
        });
        return;
      }

      Alert.alert("Login Successful", "Welcome!");
      router.replace("../homedriver/dhome");
    } catch (error: any) {
      console.error("Login error (driver):", error, error?.stack);
      Alert.alert("Login Failed", error?.message || "Network/server error");
    } finally {
      setBusy(false);
    }
  };

  const goToDriverVerification = () => {
    const targetEmail = verificationEmail || email.trim().toLowerCase();

    router.push({
      pathname: "/login_and_reg/dverify-email",
      params: {
        email: targetEmail,
        autoSend: "true",
      },
    });
  };

  const noticeIcon =
    noticeType === "email"
      ? "mail-unread-outline"
      : noticeType === "rejected"
      ? "close-circle-outline"
      : "shield-checkmark-outline";

  const noticeTitle =
    noticeType === "email"
      ? "Email verification required"
      : noticeType === "rejected"
      ? "Driver verification rejected"
      : "Admin verification pending";

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <TouchableOpacity
            onPress={() => router.push("../location/welcome")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Driver Login
            </Text>

            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Sign in to continue as a TODA Go driver.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.label, { color: colors.label }]}>Email</Text>

            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="example@email.com"
                placeholderTextColor={colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setNoticeType(null);
                  setNoticeMessage("");
                  setVerificationEmail("");
                }}
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.label, { color: colors.label }]}>Password</Text>

            <View
              style={[
                styles.inputContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter your password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!isPasswordVisible}
                value={pass}
                onChangeText={setPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />

              <TouchableOpacity
                onPress={() => setIsPasswordVisible((prev) => !prev)}
                hitSlop={10}
              >
                <MaterialIcons
                  name={isPasswordVisible ? "visibility" : "visibility-off"}
                  size={21}
                  color={colors.placeholder}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgot}
              activeOpacity={0.7}
              onPress={() => router.push("/login_and_reg/dforgetpass")}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
            
            {noticeType && (
              <View
                style={[
                  styles.noticeCard,
                  {
                    borderColor: colors.noticeBorder,
                    backgroundColor: colors.noticeBg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.noticeIconWrap,
                    { backgroundColor: colors.noticeIconBg },
                  ]}
                >
                  <Ionicons
                    name={noticeIcon as any}
                    size={19}
                    color={
                      noticeType === "rejected" ? colors.danger : colors.primary
                    }
                  />
                </View>

                <View style={styles.noticeContent}>
                  <Text style={[styles.noticeTitle, { color: colors.text }]}>
                    {noticeTitle}
                  </Text>

                  <Text style={[styles.noticeMessage, { color: colors.muted }]}>
                    {noticeMessage}
                  </Text>

                  {noticeType === "email" && (
                    <TouchableOpacity
                      style={[
                        styles.noticeButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={goToDriverVerification}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.noticeButtonText,
                          { color: colors.primary },
                        ]}
                      >
                        Continue to Verification
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.signInBtn, busy && styles.signInBtnDisabled]}
              onPress={loginDriver}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
              <Text style={[styles.orText, { color: colors.placeholder }]}>or</Text>
              <View style={[styles.line, { backgroundColor: colors.border }]} />
            </View>

            <Text style={[styles.signupPrompt, { color: colors.muted }]}>
              Don&apos;t have an account?{" "}
              <Text
                style={[styles.signupLink, { color: colors.primary }]}
                onPress={() => router.push("/login_and_reg/dregister")}
              >
                Sign Up
              </Text>
            </Text>
          </View>
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
    danger: "#EF4444",

    noticeBg: isDark ? "#111827" : "#F6FAFC",
    noticeBorder: isDark ? "#374151" : "#D9E8EF",
    noticeIconBg: isDark ? "#1F2937" : "#EAF4F8",
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    width: width * 0.88,
    alignSelf: "center",
    paddingTop: 62,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 34,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 2,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    minHeight: 50,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  forgot: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 18,
  },
  forgotText: {
    color: "#DD1F1F",
    fontSize: 13,
    fontWeight: "700",
  },
  noticeCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  noticeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  noticeMessage: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  noticeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    marginTop: 12,
  },
  noticeButtonText: {
    fontSize: 13,
    fontWeight: "900",
  },
  signInBtn: {
    backgroundColor: "#5089A3",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 2,
    marginBottom: 24,
    minHeight: 50,
    justifyContent: "center",
  },
  signInBtnDisabled: {
    opacity: 0.65,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 23,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 13,
  },
  signupPrompt: {
    textAlign: "center",
    fontSize: 14,
  },
  signupLink: {
    fontWeight: "900",
  },
});