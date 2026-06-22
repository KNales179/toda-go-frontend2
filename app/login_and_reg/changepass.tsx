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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { API_BASE_URL } from "../../config";

export default function ChangePass() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = typeof params.email === "string" ? params.email : "";
  const userType = typeof params.userType === "string" ? params.userType : "passenger";

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const isDriver = userType === "driver";

  const loginPath = isDriver
    ? "/login_and_reg/dlogin"
    : "/login_and_reg/plogin";

  const endpoint = isDriver
    ? `${API_BASE_URL}/api/auth/driver/forgot-password/change-password`
    : `${API_BASE_URL}/api/auth/passenger/forgot-password/change-password`;

  const handleChangePassword = async () => {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      Alert.alert("Missing Email", "Reset email is missing. Please try forgot password again.");
      router.replace(loginPath as any);
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert("Missing Password", "Please enter and confirm your new password.");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    Keyboard.dismiss();
    setBusy(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          newPassword,
        }),
      });

      const text = await response.text();
      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        throw new Error(data?.message || "Unable to change password.");
      }

      Alert.alert(
        "Password Changed",
        data?.message || "You can now log in with your new password.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace(loginPath as any),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert("Change Failed", error?.message || "Network/server error.");
    } finally {
      setBusy(false);
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
          <TouchableOpacity
            onPress={() => router.replace(loginPath as any)}
            style={styles.backRow}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
            <Text style={[styles.back, { color: colors.text }]}>Back to Login</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>
            Change Password
          </Text>

          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Create a new password for your {isDriver ? "driver" : "passenger"} account.
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
            <Text style={[styles.emailText, { color: colors.muted }]}>
              Account: <Text style={{ color: colors.text, fontWeight: "800" }}>{email}</Text>
            </Text>

            <Text style={[styles.label, { color: colors.label }]}>New Password</Text>

            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Enter new password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={() => setShowNewPassword((prev) => !prev)}
                hitSlop={10}
              >
                <MaterialIcons
                  name={showNewPassword ? "visibility" : "visibility-off"}
                  size={21}
                  color={colors.placeholder}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.label }]}>
              Confirm Password
            </Text>
 
            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.inputBg,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.text }]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.placeholder}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                hitSlop={10}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={21}
                  color={colors.placeholder}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save New Password</Text>
              )}
            </TouchableOpacity>
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
  emailText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  passwordContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
  },
  button: {
    backgroundColor: "#5089A3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
});