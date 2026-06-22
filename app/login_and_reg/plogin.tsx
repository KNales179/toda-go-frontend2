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
import { saveAuth } from "../utils/authStorage";

const { width } = Dimensions.get("window");

export default function PLogin() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const loginUser = async () => {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !pass) {
      Alert.alert("Missing Information", "Please enter your email and password.");
      return;
    }

    setBusy(true);
    setNeedsVerification(false);
    setVerificationEmail("");

    Keyboard.dismiss();

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/passenger/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        if (data?.needEmailVerification) {
          setNeedsVerification(true);
          setVerificationEmail(data?.email || cleanEmail);
          return;
        }

        throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
      }

      const passengerId =
        data?.userId || data?.passenger?._id || data?.user?._id || data?._id;

      if (!passengerId) {
        throw new Error("Login succeeded but no passengerId returned");
      }

      const token =
        data?.token || data?.accessToken || data?.jwt || data?.authToken;

      if (!token) {
        throw new Error("Login succeeded but no token returned");
      }

      await AsyncStorage.setItem("passengerId", String(passengerId));
      await AsyncStorage.setItem("token", String(token));

      await saveAuth({
        token: String(token),
        userId: String(passengerId),
        role: "passenger",
      });

      const infoRes = await fetch(`${API_BASE_URL}/api/passenger/${passengerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const infoText = await infoRes.text();
      let info: any = null;

      try {
        info = infoText ? JSON.parse(infoText) : null;
      } catch {}

      const passenger = info?.passenger || null;
      const restriction = passenger?.restriction || null;

      const isRestricted = !!restriction?.isRestricted;
      const endAt = restriction?.endAt
        ? new Date(restriction.endAt).getTime()
        : null;
      const active = isRestricted && (!endAt || endAt > Date.now());

      if (active) {
        router.replace({
          pathname: "/restriction",
          params: {
            userType: "passenger",
            name: passenger?.firstName
              ? `${passenger.firstName} ${passenger.lastName || ""}`.trim()
              : "Passenger",
            type: restriction?.type || "ban",
            reason: restriction?.reason || "",
            endAt: restriction?.endAt ? String(restriction.endAt) : "",
          },
        });
        return;
      }

      Alert.alert("Login Successful", "Welcome!");
      router.replace("../homepassenger/phome");
    } catch (error: any) {
      Alert.alert("Login Failed", error?.message || "Network/server error");
    } finally {
      setBusy(false);
    }
  };

  const goToVerification = () => {
    const targetEmail = verificationEmail || email.trim().toLowerCase();

    router.push({
      pathname: "/login_and_reg/pverify-email",
      params: {
        email: targetEmail,
        autoSend: "true",
      },
    });
  };

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
              Welcome Back
            </Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Sign in to continue using TODA Go.
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
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setNeedsVerification(false);
                  setVerificationEmail("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
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
              onPress={() => router.push("/login_and_reg/pforgetpass")}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {needsVerification && (
              <View
                style={[
                  styles.verifyCard,
                  {
                    borderColor: colors.verifyBorder,
                    backgroundColor: colors.verifyBg,
                  },
                ]}
              >
                <View style={styles.verifyHeader}>
                  <View
                    style={[
                      styles.verifyIconWrap,
                      { backgroundColor: colors.verifyIconBg },
                    ]}
                  >
                    <Ionicons
                      name="mail-unread-outline"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View style={styles.verifyTextWrap}>
                    <Text style={[styles.verifyTitle, { color: colors.text }]}>
                      Verify your email
                    </Text>
                    <Text style={[styles.verifyMessage, { color: colors.muted }]}>
                      Your account exists, but email verification is still required.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.verifyButton, { borderColor: colors.primary }]}
                  onPress={goToVerification}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.verifyButtonText, { color: colors.primary }]}>
                    Continue to Verification
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.signInBtn, busy && styles.signInBtnDisabled]}
              onPress={loginUser}
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
                onPress={() => router.push("/login_and_reg/pregister")}
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

    verifyBg: isDark ? "#111827" : "#F6FAFC",
    verifyBorder: isDark ? "#374151" : "#D9E8EF",
    verifyIconBg: isDark ? "#1F2937" : "#EAF4F8",

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
  verifyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  verifyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  verifyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  verifyTextWrap: {
    flex: 1,
  },
  verifyTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  verifyMessage: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  verifyButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  verifyButtonText: {
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
});