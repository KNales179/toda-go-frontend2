import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Keyboard
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import RegisterProgressBar from "../components/RegisterProgressBar";
import { useRegister } from "./RegisterContext";

type PickerType = "experience" | "sector" | null;

function Thumb({ uri }: { uri?: string }) {
  if (!uri) return null;

  return (
    <Image
      source={{ uri }}
      style={{
        width: 58,
        height: 58,
        borderRadius: 10,
        backgroundColor: "#eee",
      }}
    />
  );
}

function getTrikeColorFromFranchise(value: string): "yellow" | "green" | "" {
  const digitsOnly = value.replace(/[^\d]/g, "");
  if (!digitsOnly) return "";

  const numberValue = Number(digitsOnly);
  if (Number.isNaN(numberValue)) return "";

  return numberValue % 2 === 1 ? "yellow" : "green";
}

export default function Step2FranchiseLicense() {
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

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModalType, setSelectedModalType] = useState<PickerType>(null);

  const experienceOptions = ["1-5 taon", "6-10 taon", "16-20 taon", "20 taon pataas"];
  const sectors = ["East", "West", "North", "South", "Other"];

  const openPicker = (type: PickerType) => {
    setSelectedModalType(type);
    setModalVisible(true);
  };

  const pickOption = (option: string) => {
    if (selectedModalType === "experience") patch({ experienceYears: option });
    if (selectedModalType === "sector") patch({ sector: option });
    setModalVisible(false);
  };

  const handleFranchiseNumberChange = (value: string) => {
    const autoColor = getTrikeColorFromFranchise(value);

    patch({
      franchiseNumber: value,
      trikeColor: autoColor,
    });
  };

  const takeLicensePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();

    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      patch({ driversLicenseImage: result.assets[0] });
    }
  };

  const chooseLicenseFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (perm.status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      patch({ driversLicenseImage: result.assets[0] });
    }
  };

  const pickLicense = () => {
    Alert.alert("Driver's License", "Choose how you want to add your driver's license.", [
      { text: "Take Photo", onPress: takeLicensePhoto },
      { text: "Choose from Gallery", onPress: chooseLicenseFromGallery },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const next = () => {
    if (!state.experienceYears.trim()) return Alert.alert("Required", "Please select driving experience.");
    if (!state.franchiseNumber.trim()) return Alert.alert("Required", "Please enter franchise number.");
    if (!state.todaName.trim()) return Alert.alert("Required", "Please enter TODA name.");
    if (!state.sector.trim()) return Alert.alert("Required", "Please select sector.");
    if (!state.trikeColor.trim()) {
      return Alert.alert("Required", "Tricycle color could not be detected. Please check the franchise number.");
    }
    if (!state.plateNumber.trim()) return Alert.alert("Required", "Please enter plate number.");
    if (!state.driversLicenseImage) {
      return Alert.alert("Required", "Please upload or take a photo of your driver's license.");
    }

    Keyboard.dismiss()

    setTimeout(() => {
      router.push("/login_and_reg/register/step3-mobile-selfie");
    }, 120)
    
  };

  const modalTitle =
    selectedModalType === "experience"
      ? "Gaano katagal ng nagmamaneho?"
      : "Pumili ng Sector";

  const list = selectedModalType === "experience" ? experienceOptions : sectors;

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
        <RegisterProgressBar step={2} total={4} title="Franchise & License" />

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.header, { color: colors.text }]}>Driving Experience</Text>

          <TouchableOpacity
            style={[styles.customPicker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => openPicker("experience")}
          >
            <Text style={[styles.pickerText, { color: state.experienceYears ? colors.text : colors.placeholder }]}>
              {state.experienceYears || "Gaano katagal ng nagmamaneho?"}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.placeholder} />
          </TouchableOpacity>

          <Text style={[styles.header, { color: colors.text }]}>Franchise Information</Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Franchise Number"
            placeholderTextColor={colors.placeholder}
            keyboardType="number-pad"
            value={state.franchiseNumber}
            onChangeText={handleFranchiseNumberChange}
          />

          <Text style={[styles.autoColorNote, { color: colors.muted }]}>
            Franchise number may affect the assigned tricycle color. Please make sure it is entered correctly.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="TODA Name"
            placeholderTextColor={colors.placeholder}
            value={state.todaName}
            onChangeText={(v) => patch({ todaName: v })}
          />

          <TouchableOpacity
            style={[styles.customPicker, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={() => openPicker("sector")}
          >
            <Text style={[styles.pickerText, { color: state.sector ? colors.text : colors.placeholder }]}>
              {state.sector || "Pumili ng Sector"}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.placeholder} />
          </TouchableOpacity>

          <Text style={[styles.header, { color: colors.text }]}>Tricycle Information</Text>

          <Text style={[styles.label, { color: colors.subText }]}>Capacity</Text>
          <View style={styles.row}>
            {[4, 6].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => patch({ capacity: n })}
                style={[
                  styles.pill,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  state.capacity === n && styles.pillActive,
                ]}
              >
                <Text style={[styles.pillText, { color: colors.text }, state.capacity === n && styles.pillTextActive]}>
                  {n} seats
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 10, color: colors.subText }]}>Tricycle Color</Text>

          <View style={[styles.autoColorBox, { backgroundColor: colors.softBox, borderColor: colors.border }]}>
            <Text style={[styles.autoColorLabel, { color: colors.muted }]}>Detected Color</Text>
            <Text style={[styles.autoColorValue, { color: colors.text }]}>
              {state.trikeColor ? state.trikeColor.toUpperCase() : "Enter franchise number first"}
            </Text>
          </View>

          <TextInput
            style={[
              styles.input,
              { marginTop: 12, backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Plate Number (LTO)"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="characters"
            value={state.plateNumber}
            onChangeText={(v) => patch({ plateNumber: v.toUpperCase() })}
          />

          <Text style={[styles.header, { color: colors.text }]}>Driver's License</Text>

          <View style={[styles.uploadBox, { backgroundColor: colors.softBox, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.uploadTitle, { color: colors.text }]}>Driver's License Image</Text>
              <Text style={[styles.uploadHint, { color: colors.muted }]}>
                Take a photo or choose a clear image.
              </Text>
            </View>

            <Thumb uri={state.driversLicenseImage?.uri} />

            <TouchableOpacity style={styles.uploadBtn} onPress={pickLicense}>
              <Text style={styles.uploadBtnText}>{state.driversLicenseImage ? "Change" : "Add"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btn} onPress={next}>
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>

        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPressOut={() => setModalVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>

              {list.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.optionItem, { borderBottomColor: colors.border }]}
                  onPress={() => pickOption(option)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
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
    margin: 16,
    borderRadius: 14,
    padding: 16,
  },
  header: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    borderRadius: 10,
  },
  customPicker: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  autoColorNote: {
    fontSize: 12,
    marginTop: -4,
    marginBottom: 10,
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  pill: {
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  pillActive: {
    borderColor: "#5089A3",
    backgroundColor: "#5089A3",
  },
  pillText: {
    fontWeight: "800",
  },
  pillTextActive: {
    color: "#fff",
  },
  autoColorBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 2,
  },
  autoColorLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  autoColorValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: "900",
  },
  uploadBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  uploadTitle: {
    fontWeight: "900",
  },
  uploadHint: {
    fontSize: 12,
    marginTop: 2,
  },
  uploadBtn: {
    backgroundColor: "#5089A3",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "#fff",
    fontWeight: "900",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalContent: {
    width: "82%",
    borderRadius: 12,
    padding: 15,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
  },
  optionItem: {
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});