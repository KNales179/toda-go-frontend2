import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  useColorScheme,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";
import { API_BASE_URL } from "../../../config";
import { ImagePickerAsset } from "expo-image-picker";

const asFile = (a: ImagePickerAsset | null, fallback = "photo.jpg") =>
  a
    ? ({
        uri: a.uri,
        name: (a as any).fileName || fallback,
        type: (a as any).mimeType || "image/jpeg",
      } as any)
    : null;

type InfoModalType = "terms" | "privacy" | null;

export default function Step4AccountSubmit() {
  const router = useRouter();
  const { state, patch, reset } = useRegister();

  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const colors = {
    bg: isDarkMode ? "#0F172A" : "#F8FAFC",
    card: isDarkMode ? "#111827" : "#FFFFFF",
    inputBg: isDarkMode ? "#1F2937" : "#FFFFFF",
    text: isDarkMode ? "#F9FAFB" : "#111827",
    subText: isDarkMode ? "#CBD5E1" : "#6B7280",
    placeholder: isDarkMode ? "#9CA3AF" : "#8A8F98",
    border: isDarkMode ? "#374151" : "#D1D5DB",
    softBox: isDarkMode ? "#1F2937" : "#F8FAFC",
    muted: isDarkMode ? "#CBD5E1" : "#6B7280",
  };

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modalType, setModalType] = useState<InfoModalType>(null);

  const submit = async () => {
    if (submitting) return;

    if (!state.driverFirstName.trim()) {
      return Alert.alert("Missing", "First name is required.");
    }

    if (!state.driverLastName.trim()) {
      return Alert.alert("Missing", "Last name is required.");
    }

    if (!state.driverBirthdate.trim()) {
      return Alert.alert("Missing", "Birthdate is required.");
    }

    if (!state.driverPhone.trim()) {
      return Alert.alert("Missing", "Mobile number is required.");
    }

    if (!state.experienceYears.trim()) {
      return Alert.alert("Missing", "Driving experience is required.");
    }

    if (!state.franchiseNumber.trim()) {
      return Alert.alert("Missing", "Franchise number is required.");
    }

    if (!state.todaName.trim()) {
      return Alert.alert("Missing", "TODA name is required.");
    }

    if (!state.sector.trim()) {
      return Alert.alert("Missing", "Sector is required.");
    }

    if (!state.plateNumber.trim()) {
      return Alert.alert("Missing", "Plate number is required.");
    }

    if (!state.trikeColor.trim()) {
      return Alert.alert("Missing", "Tricycle color is required.");
    }

    if (!state.driversLicenseImage) {
      return Alert.alert("Missing", "Driver's license image is required.");
    }

    if (!state.selfieImage) {
      return Alert.alert("Missing", "Selfie is required.");
    }

    if (!state.email.trim()) {
      return Alert.alert("Missing", "Email is required.");
    }

    if (!state.password) {
      return Alert.alert("Missing", "Password is required.");
    }

    if (!state.confirmPassword) {
      return Alert.alert("Missing", "Confirm password is required.");
    }

    if (state.password.length < 6) {
      return Alert.alert("Weak Password", "Password must be at least 6 characters.");
    }

    if (state.password !== state.confirmPassword) {
      return Alert.alert("Password Mismatch", "Passwords do not match.");
    }

    const cleanEmail = state.email.trim().toLowerCase();

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const fd = new FormData();

      fd.append("driverFirstName", state.driverFirstName.trim());
      fd.append("driverMiddleName", state.driverMiddleName.trim());
      fd.append("driverLastName", state.driverLastName.trim());
      fd.append("driverSuffix", state.driverSuffix.trim());
      fd.append("driverBirthdate", state.driverBirthdate.trim());
      fd.append("driverPhone", state.driverPhone.trim());

      fd.append("experienceYears", state.experienceYears.trim());
      fd.append("franchiseNumber", state.franchiseNumber.trim());
      fd.append("todaName", state.todaName.trim());
      fd.append("sector", state.sector.trim());
      fd.append("capacity", String(state.capacity));
      fd.append("trikeColor", state.trikeColor || "");
      fd.append("plateNumber", state.plateNumber.trim());

      fd.append("driverEmail", cleanEmail);
      fd.append("driverPassword", state.password);

      const license = asFile(state.driversLicenseImage, "license.jpg");
      if (license) fd.append("driversLicenseImage", license);

      const selfie = asFile(state.selfieImage, "selfie.jpg");
      if (selfie) fd.append("selfie", selfie);

      const res = await fetch(`${API_BASE_URL}/api/auth/driver/register-driver`, {
        method: "POST",
        body: fd,
        headers: {
          Accept: "application/json",
        },
      });

      const text = await res.text();

      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        Alert.alert("Registration Failed", data?.error || data?.message || text);
        return;
      }

      const nextEmail = data?.email || cleanEmail;

      Alert.alert(
        "Verification Code Sent",
        data?.message ||
          "Registration successful. Please check your email and enter the 6-digit verification code.",
        [
          {
            text: "Continue",
            onPress: () => {
              reset();
              Keyboard.dismiss();

              setTimeout(() => {
                router.replace({
                  pathname: "/login_and_reg/dverify-email",
                  params: { email: nextEmail },
                });
              }, 120);
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const modalTitle =
    modalType === "terms" ? "Terms of Service" : "Privacy Policy";

  const modalContent =
    modalType === "terms"
      ? [
          "You agree to provide true and accurate registration information.",
          "Your account may be reviewed by TFRO/admin before full driver access is granted.",
          "Misuse of the application, false documents, or unsafe behavior may result in account restriction.",
          "The system is intended for TODA GO transportation-related services only.",
        ]
      : [
          "Your personal information is collected for account registration and driver verification.",
          "Your driver’s license and selfie are used for admin review and legitimacy checking.",
          "Your email is used for account verification and system notifications.",
          "Your data will not be shared outside the system except when required for official verification or lawful purposes.",
        ];

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardWrap, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: colors.bg },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        <RegisterProgressBar step={4} total={4} title="Account" />

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.header, { color: colors.text }]}>
            Create Driver Account
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            value={state.email}
            onChangeText={(v) => patch({ email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.passwordWrap}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                  paddingRight: 44,
                },
              ]}
              placeholder="Password"
              placeholderTextColor={colors.placeholder}
              value={state.password}
              onChangeText={(v) => patch({ password: v })}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eye}
              hitSlop={10}
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.placeholder}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordWrap}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  borderColor: colors.border,
                  paddingRight: 44,
                },
              ]}
              placeholder="Confirm Password"
              placeholderTextColor={colors.placeholder}
              value={state.confirmPassword}
              onChangeText={(v) => patch({ confirmPassword: v })}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eye}
              hitSlop={10}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={20}
                color={colors.placeholder}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: colors.softBox,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Registration Summary
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              Driver: {state.driverFirstName} {state.driverLastName}
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              Phone: {state.driverPhone}
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              TODA: {state.todaName}
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              Franchise: {state.franchiseNumber}
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              Tricycle Color: {state.trikeColor.toUpperCase()}
            </Text>

            <Text style={[styles.summaryText, { color: colors.subText }]}>
              Plate: {state.plateNumber}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            onPress={submit}
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? "Submitting..." : "Submit"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.signupPrompt, { color: colors.subText }]}>
            Already have an account?{" "}
            <Text
              style={styles.signupLink}
              onPress={() => router.replace("/login_and_reg/dlogin")}
            >
              Log In
            </Text>
          </Text>

          <View style={styles.footerTextContainer}>
            <Text style={[styles.agreementText, { color: colors.muted }]}>
              By signing up, you agree to the{" "}
              <Text
                style={styles.linkText}
                onPress={() => setModalType("terms")}
              >
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text
                style={styles.linkText}
                onPress={() => setModalType("privacy")}
              >
                Privacy Policy.
              </Text>
            </Text>

            <Text style={[styles.helpTitle, { color: colors.text }]}>
              {"\n"}Kailangan ng tulong sa registration?
            </Text>

            <Text style={[styles.helpSubtitle, { color: colors.subText }]}>
              Pumunta sa TFRO - Lucena Office upang magpaturo
            </Text>
          </View>
        </View>

        <Modal
          animationType="fade"
          transparent
          visible={modalType !== null}
          onRequestClose={() => setModalType(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {modalTitle}
                </Text>

                <TouchableOpacity onPress={() => setModalType(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {modalContent.map((item, index) => (
                <View key={index} style={styles.modalItem}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={[styles.modalText, { color: colors.subText }]}>
                    {item}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalType(null)}
              >
                <Text style={styles.modalButtonText}>I Understand</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    flex: 1,
    marginTop: 30,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    margin: 20,
    borderRadius: 14,
    padding: 20,
  },
  header: {
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 15,
    borderRadius: 10,
  },
  passwordWrap: {
    position: "relative",
  },
  eye: {
    position: "absolute",
    right: 12,
    top: 13,
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontWeight: "900",
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 12,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: "#5089A3",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "900",
  },
  signupPrompt: {
    textAlign: "center",
    marginTop: 15,
  },
  signupLink: {
    color: "#5089A3",
    fontWeight: "700",
  },
  footerTextContainer: {
    marginTop: 20,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  agreementText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#5089A3",
    fontWeight: "bold",
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  helpSubtitle: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  modalItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  bullet: {
    color: "#5089A3",
    fontWeight: "900",
    fontSize: 16,
  },
  modalText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  modalButton: {
    backgroundColor: "#5089A3",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "900",
  },
});