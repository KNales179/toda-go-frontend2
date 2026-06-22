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
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  useColorScheme,
  ActivityIndicator,
  Image,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { API_BASE_URL } from "../../config";

const PROFILE_PLACEHOLDER = require("../../assets/images/profile-placeholder.jpg");

type PickedImage = {
  uri: string;
  name: string;
  type: string;
};

export default function PRegister() {
  const router = useRouter();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = useMemo(() => getColors(isDark), [isDark]);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");

  const [profileImage, setProfileImage] = useState<PickedImage | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [busy, setBusy] = useState(false);

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event.type === "dismissed") return;

    if (selectedDate) {
      const formatted = selectedDate.toISOString().split("T")[0];
      setBirthday(formatted);
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert("Permission Needed", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        cameraType: ImagePicker.CameraType.front,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];

        setProfileImage({
          uri: asset.uri,
          name: `passenger-profile-${Date.now()}.jpg`,
          type: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("takeProfilePhoto error:", error);
      Alert.alert("Error", "Unable to open camera.");
    }
  };

  const handleRegister = async () => {
    if (busy) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !birthday ||
      !cleanPhone ||
      !cleanEmail ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    if (!validateEmail(cleanEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (cleanPhone.length < 10) {
      Alert.alert("Invalid Phone Number", "Please enter a valid mobile number.");
      return;
    }

    if (!profileImage) {
      Alert.alert("Profile Photo Required", "Please take a profile photo.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }

    Keyboard.dismiss();
    setBusy(true);

    try {
      const formData = new FormData();

      formData.append("firstName", firstName.trim());
      formData.append("middleName", middleName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("suffix", suffix.trim());
      formData.append("birthday", birthday);
      formData.append("phone", cleanPhone);
      formData.append("email", cleanEmail);
      formData.append("password", password);

      formData.append("profileImage", {
        uri: profileImage.uri,
        name: profileImage.name,
        type: profileImage.type,
      } as any);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/passenger/register-passenger`,
        {
          method: "POST",
          body: formData,
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
        throw new Error(
          data?.error ||
            data?.message ||
            data?.details ||
            "Registration failed."
        );
      }

      const nextEmail = data?.email || cleanEmail;

      Alert.alert(
        "Verification Code Sent",
        data?.message ||
          "Please check your email and enter the 6-digit verification code.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.replace({
                pathname: "/login_and_reg/pverify-email",
                params: { email: nextEmail },
              }),
          },
        ]
      );
    } catch (error: any) {
      console.error("handleRegister error:", error);
      Alert.alert(
        "Registration Failed",
        error?.message || "Network/server error."
      );
    } finally {
      setBusy(false);
    }
  };

  const renderInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = "default",
    autoCapitalize = "words",
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    keyboardType?: any;
    autoCapitalize?: "none" | "sentences" | "words" | "characters";
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
      />
    </View>
  );

  const renderPasswordInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    visible,
    onToggle,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    visible: boolean;
    onToggle: () => void;
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.label }]}>{label}</Text>

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
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TouchableOpacity onPress={onToggle} hitSlop={10}>
          <MaterialIcons
            name={visible ? "visibility" : "visibility-off"}
            size={22}
            color={colors.placeholder}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={Platform.OS === "ios"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={[
            styles.scrollContent,
            { backgroundColor: colors.background },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <Text style={[styles.title, { color: colors.text }]}>
            Passenger Registration
          </Text>

          <View
            style={[
              styles.card,
              styles.profileCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TouchableOpacity
              onPress={takeProfilePhoto}
              activeOpacity={0.85}
              style={styles.profilePhotoButton}
            >
              <Image
                source={
                  profileImage ? { uri: profileImage.uri } : PROFILE_PLACEHOLDER
                }
                style={styles.profilePhoto}
              />

              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>

            <Text style={[styles.profileTitle, { color: colors.text }]}>
              Profile Photo
            </Text>

            <Text style={[styles.profileHint, { color: colors.muted }]}>
              Tap the photo to take or retake your profile picture.
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Personal Details
            </Text>

            {renderInput({
              label: "First Name *",
              value: firstName,
              onChangeText: setFirstName,
              placeholder: "Enter first name",
            })}

            {renderInput({
              label: "Middle Name",
              value: middleName,
              onChangeText: setMiddleName,
              placeholder: "Enter middle name",
            })}

            {renderInput({
              label: "Last Name *",
              value: lastName,
              onChangeText: setLastName,
              placeholder: "Enter last name",
            })}

            {renderInput({
              label: "Suffix",
              value: suffix,
              onChangeText: setSuffix,
              placeholder: "Jr., Sr., III, etc. (optional)",
            })}

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.label }]}>
                Birthdate *
              </Text>

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.dateInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.inputBg,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text
                  style={{
                    color: birthday ? colors.text : colors.placeholder,
                    fontSize: 15,
                  }}
                >
                  {birthday || "Select birthdate"}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={
                  birthday && !isNaN(new Date(birthday).getTime())
                    ? new Date(birthday)
                    : new Date()
                }
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}

            {renderInput({
              label: "Phone / Mobile Number *",
              value: phone,
              onChangeText: setPhone,
              placeholder: "09XXXXXXXXX",
              keyboardType: "phone-pad",
              autoCapitalize: "none",
            })}
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account Details
            </Text>

            {renderInput({
              label: "Email *",
              value: email,
              onChangeText: setEmail,
              placeholder: "example@email.com",
              keyboardType: "email-address",
              autoCapitalize: "none",
            })}

            {renderPasswordInput({
              label: "Password *",
              value: password,
              onChangeText: setPassword,
              placeholder: "Enter password",
              visible: passwordVisible,
              onToggle: () => setPasswordVisible((prev) => !prev),
            })}

            {renderPasswordInput({
              label: "Confirm Password *",
              value: confirmPassword,
              onChangeText: setConfirmPassword,
              placeholder: "Confirm password",
              visible: confirmPasswordVisible,
              onToggle: () => setConfirmPasswordVisible((prev) => !prev),
            })}
          </View>

          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Next</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.switchText, { color: colors.muted }]}>
            Already have an account?{" "}
            <Text
              style={[styles.link, { color: colors.primary }]}
              onPress={() => router.push("/login_and_reg/plogin")}
            >
              Log In
            </Text>
          </Text>
        </ScrollView>
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
    marginTop: 30,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  profileCard: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 18,
  },
  profilePhotoButton: {
    width: 128,
    height: 128,
    marginBottom: 12,
  },
  profilePhoto: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: "#D0D0D0",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#5089A3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  profileHint: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
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
  },
  dateInput: {
    justifyContent: "center",
  },
  passwordContainer: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
  },
  button: {
    marginTop: 4,
    backgroundColor: "#5089A3",
    paddingVertical: 14,
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
  switchText: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 4,
  },
  link: {
    fontWeight: "800",
  },
});