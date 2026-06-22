import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from "react-native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";
import { Ionicons } from "@expo/vector-icons";

const PROFILE_PLACEHOLDER = require("../../../assets/images/profile-placeholder.jpg");

export default function Step3MobileSelfie() {
  const router = useRouter();
  const { state, patch } = useRegister();

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
  const takeSelfie = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();

    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      cameraType: ImagePicker.CameraType.front,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      patch({ selfieImage: result.assets[0] });
    }
  };

  const next = () => {
    if (!state.selfieImage) {
      Alert.alert("Required", "Please take a selfie for face verification.");
      return;
    }

    router.push("/login_and_reg/register/step4-account-submit");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.keyboardWrap, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
      >
        <RegisterProgressBar step={3} total={4} title="Face Verification" />

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.header, { color: colors.text }]}>Selfie / Face Verification</Text>

          <Text style={[styles.note, { color: colors.muted }]}>
            Take a clear selfie using the camera. Gallery upload is disabled for driver verification.
          </Text>

          <View style={styles.selfieWrap}>
            <TouchableOpacity onPress={takeSelfie} activeOpacity={0.85}>
              <Image
                source={state.selfieImage ? { uri: state.selfieImage.uri } : PROFILE_PLACEHOLDER}
                style={styles.selfie}
              />

              <View style={styles.badge}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.softBox, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>For admin verification</Text>
            <Text style={[styles.infoText, { color: colors.subText }]}>
              Your selfie will be reviewed together with your driver’s license to verify your legitimacy.
            </Text>
          </View>

          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
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
    margin: 16,
    borderRadius: 14,
    padding: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  selfieWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  selfie: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#D0D0D0",
  },
  badge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5089A3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoTitle: {
    fontWeight: "900",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
  btn: {
    marginTop: 4,
    backgroundColor: "#5089A3",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});